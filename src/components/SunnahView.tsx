import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  BookOpen, 
  Share2, 
  Copy, 
  Check, 
  ChevronRight, 
  HeartHandshake, 
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Info,
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SUNNAH_DATA, ALL_SUNNAH_ITEMS } from '../data/sunnahData';
import { SunnahCategory, SunnahItem } from '../types';
import { triggerHaptic } from '../utils/audio';
import { toBengaliDigits } from '../utils/prayerTimes';
import { storage } from '../utils/storage';
import { useSync } from '../context/SyncContext';
import { COIN_REWARDS } from '../utils/coins';

interface SunnahViewProps {
  onBack?: () => void;
  onOpenShareModal?: (content: {
    title: string;
    arabic?: string;
    translation: string;
    reference: string;
  }) => void;
}

export const SunnahView: React.FC<SunnahViewProps> = ({
  onBack,
  onOpenShareModal
}) => {
  const { amalRecords, saveAmalRecord, publishedCmsContents } = useSync();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [coinNotification, setCoinNotification] = useState<string | null>(null);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(() => {
    try {
      const bmarks = storage.getBookmarks();
      return new Set(bmarks.filter(b => b.type === 'hadith').map(b => b.dataRefId));
    } catch {
      return new Set();
    }
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayRecord = amalRecords[todayKey] || {
    dateKey: todayKey,
    prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
    morningAzkarDone: false,
    eveningAzkarDone: false,
    fastingDone: false,
    sadaqahDone: false,
    tasbihCount: 0,
    completedSunnahKeys: []
  };

  const completedSunnahSet = new Set(todayRecord.completedSunnahKeys || []);

  const combinedSunnahItems = useMemo(() => {
    const remoteItems = (publishedCmsContents || [])
      .filter((c) => c.type === 'daily_amal' || c.type === 'article')
      .map((c) => ({
        categoryId: 'daily_life',
        categoryTitle: c.categoryBn || 'দৈনিক সুন্নাহ ও আমল',
        categoryIcon: 'sparkles',
        title: c.titleBn,
        subtitle: c.categoryBn || 'অ্যাডমিন প্রকাশিত সুন্নাহ আমল',
        description: c.translationBn,
        points: c.transliteration ? [c.transliteration] : [],
        hadith: {
          arabic: c.arabic || '',
          bangla: c.translationBn,
          source: c.reference || 'সহিহ হাদিস'
        },
        importance: 'হাতের নাগালে প্রতিদিনের সুন্নাহ আমল'
      }));
    return [...remoteItems, ...ALL_SUNNAH_ITEMS];
  }, [publishedCmsContents]);

  const totalItemsCount = useMemo(() => {
    return combinedSunnahItems.length;
  }, [combinedSunnahItems]);

  // Filter items based on active category and search
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return combinedSunnahItems.filter((item) => {
      const matchesCategory = selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
      if (!matchesCategory) return false;

      if (!q) return true;

      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.points.some(p => p.toLowerCase().includes(q)) ||
        item.hadith.bangla.toLowerCase().includes(q) ||
        item.hadith.source.toLowerCase().includes(q) ||
        item.hadith.arabic.toLowerCase().includes(q)
      );
    });
  }, [combinedSunnahItems, selectedCategoryId, searchQuery]);

  const handleToggleSunnahPracticed = (itemKey: string) => {
    triggerHaptic(25);
    const wasDone = completedSunnahSet.has(itemKey);
    let updatedKeys: string[];

    if (wasDone) {
      updatedKeys = (todayRecord.completedSunnahKeys || []).filter(k => k !== itemKey);
    } else {
      updatedKeys = [...(todayRecord.completedSunnahKeys || []), itemKey];
      setCoinNotification(`+${toBengaliDigits(COIN_REWARDS.SUNNAH)} কয়েন অর্জিত! (সুন্নাহ আমল)`);
      setTimeout(() => setCoinNotification(null), 2400);

      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.8 },
          colors: ['#177a56', '#10b981', '#f59e0b']
        });
      } catch (e) {}
    }

    saveAmalRecord({
      ...todayRecord,
      sunnahDone: updatedKeys.length > 0,
      completedSunnahKeys: updatedKeys
    });
  };

  const handleCopy = (item: SunnahItem, id: string) => {
    triggerHaptic(20);
    const textToCopy = `【সুন্নাহ — ${item.title}】\n${item.subtitle}\n\n${item.description}\n\nআমলের পয়েন্টসমূহ:\n${item.points.map(p => `• ${p}`).join('\n')}\n\nহাদিস:\n"${item.hadith.bangla}"\n[সূত্র: ${item.hadith.source}]\n\n― Muslim Reminder (মুসলিম রিমাইন্ডার) অ্যাপ থেকে সংগৃহীত`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }).catch(() => {});
  };

  const handleShare = (item: SunnahItem) => {
    triggerHaptic(15);
    if (onOpenShareModal) {
      onOpenShareModal({
        title: item.title,
        arabic: item.hadith.arabic,
        translation: `${item.description}\n\nরাসূলুল্লাহ (সা:) বলেছেন: "${item.hadith.bangla}"`,
        reference: item.hadith.source
      });
    } else if (navigator.share) {
      navigator.share({
        title: `সুন্নাহ — ${item.title}`,
        text: `${item.title}: ${item.description}\nসূত্র: ${item.hadith.source}`
      }).catch(() => {});
    }
  };

  const handleToggleBookmark = (item: SunnahItem, id: string) => {
    triggerHaptic(15);
    const isBookmarked = bookmarkedItems.has(id);
    const updated = new Set(bookmarkedItems);

    if (isBookmarked) {
      updated.delete(id);
      const allBmarks = storage.getBookmarks();
      const filtered = allBmarks.filter(b => !(b.type === 'hadith' && b.dataRefId === id));
      storage.saveBookmarks(filtered);
    } else {
      updated.add(id);
      const allBmarks = storage.getBookmarks();
      storage.saveBookmarks([
        {
          id: `bm_sunnah_${Date.now()}`,
          type: 'hadith',
          title: item.title,
          subtitle: item.subtitle,
          reference: item.hadith.source,
          dataRefId: id,
          createdAt: Date.now()
        },
        ...allBmarks
      ]);
    }
    setBookmarkedItems(updated);
  };

  return (
    <div className="pb-24 pt-2 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* Coin notification toast (Yellow Frosted Glass) */}
      {coinNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400/55 via-yellow-300/45 to-amber-500/55 dark:from-amber-400/35 dark:via-yellow-400/25 dark:to-amber-500/35 backdrop-blur-xl backdrop-saturate-150 text-amber-950 dark:text-amber-50 font-extrabold text-xs sm:text-sm flex items-center gap-2.5 border border-amber-200/80 dark:border-amber-300/45 ring-1 ring-white/45 shadow-[0_8px_30px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] whitespace-nowrap max-w-[92vw]">
            <div className="w-6 h-6 rounded-full bg-amber-400/70 dark:bg-amber-400/40 border border-white/70 flex items-center justify-center shrink-0 shadow-xs">
              <Coins className="w-3.5 h-3.5 text-amber-950 dark:text-amber-100 fill-amber-500" />
            </div>
            <span className="truncate drop-shadow-[0_1px_1px_rgba(255,255,255,0.45)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {coinNotification}
            </span>
          </div>
        </div>
      )}

      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0b3c2a] text-white p-5 shadow-md border border-emerald-500/20">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-xs font-bold text-emerald-100 hover:text-white bg-white/10 px-2.5 py-1 rounded-xl transition-all cursor-pointer backdrop-blur-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ফিরে যান</span>
              </button>
            )}
            <div className="flex items-center gap-1 text-[11px] font-bold bg-amber-400 text-stone-950 px-2.5 py-0.5 rounded-full shadow-2xs ml-auto">
              <Coins className="w-3 h-3 fill-stone-950" />
              <span>+{toBengaliDigits(COIN_REWARDS.SUNNAH)} কয়েন/আমল</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5 fill-amber-300/30" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                দৈনন্দিন সুন্নাহ সমগ্র
              </h1>
              <p className="text-xs text-emerald-100/90 font-medium">
                নবীজী (সা:)-এর বিশুদ্ধ হাদিসভিত্তিক সুন্নাত ও আদব
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 text-[11px] text-emerald-100 font-semibold border-t border-white/15">
            <span>{toBengaliDigits(SUNNAH_DATA.categories.length)}টি ক্যাটাগরি</span>
            <span>•</span>
            <span>{toBengaliDigits(totalItemsCount)}টি সুন্নাহ আমল</span>
            <span>•</span>
            <span className="text-amber-300 font-bold">আজকে পালিত: {toBengaliDigits(completedSunnahSet.size)}টি</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="সুন্নাহ খুঁজুন (যেমন: কিয়াম, রুকু, মেসওয়াক, সালাম)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 text-xs sm:text-sm focus:outline-none focus:border-[#177a56] dark:text-stone-100 placeholder-stone-400 font-medium shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
          >
            মুছুন
          </button>
        )}
      </div>

      {/* Category Pills (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategoryId === 'all'
              ? 'bg-[#177a56] text-white shadow-xs'
              : 'bg-white dark:bg-[#131b17] text-stone-700 dark:text-stone-300 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-stone-50'
          }`}
        >
          সকল ({toBengaliDigits(totalItemsCount)})
        </button>
        {SUNNAH_DATA.categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.category_id;
          return (
            <button
              key={cat.category_id}
              onClick={() => setSelectedCategoryId(cat.category_id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#177a56] text-white shadow-xs'
                  : 'bg-white dark:bg-[#131b17] text-stone-700 dark:text-stone-300 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-stone-50'
              }`}
            >
              {cat.title} ({toBengaliDigits(cat.count)})
            </button>
          );
        })}
      </div>

      {/* Items List */}
      <div className="space-y-3.5">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#131b17] rounded-3xl border border-stone-200 dark:border-stone-800 text-stone-500 space-y-2">
            <Info className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-xs sm:text-sm font-medium">কোনো সুন্নাহ পাওয়া যায়নি। ভিন্ন শব্দে অনুসন্ধান করুন।</p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const itemKey = `${item.categoryId}_${index}`;
            const isCopied = copiedId === itemKey;
            const isBookmarked = bookmarkedItems.has(itemKey);
            const isPracticed = completedSunnahSet.has(itemKey);

            return (
              <article
                key={itemKey}
                className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs space-y-3 transition-all hover:border-[#177a56]/30"
              >
                {/* Item Top Bar */}
                <div className="flex items-start justify-between gap-2 border-b border-stone-100 dark:border-stone-800/80 pb-2.5">
                  <div>
                    <span className="text-[11px] font-bold text-[#177a56] dark:text-emerald-400 tracking-wide uppercase">
                      {item.categoryTitle}
                    </span>
                    <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-50 leading-snug mt-0.5">
                      {item.title}
                    </h2>
                    <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleBookmark(item, itemKey)}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isBookmarked
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                          : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                      title={isBookmarked ? 'বুকমার্ক সরানো হয়েছে' : 'বুকমার্ক করুন'}
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleCopy(item, itemKey)}
                      className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
                      title="কপি করুন"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleShare(item)}
                      className="p-2 rounded-xl text-stone-400 hover:text-[#177a56] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-all cursor-pointer"
                      title="শেয়ার করুন"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed font-normal">
                  {item.description}
                </p>

                {/* Points / Steps Checklist */}
                {item.points && item.points.length > 0 && (
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/10 space-y-2">
                    <span className="text-[11px] font-bold text-[#177a56] dark:text-emerald-400 uppercase tracking-wider block">
                      আমলের নিয়ম ও করণীয় ধাপসমূহ
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {item.points.map((point, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#177a56] dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-xs text-stone-700 dark:text-stone-300 font-medium leading-snug">
                            {point}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hadith Block */}
                {item.hadith && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        হাদিস সূত্র · {item.hadith.source}
                      </span>
                      <span className="text-[10px] text-stone-400">সহিহ দলিল</span>
                    </div>

                    {item.hadith.arabic && (
                      <p 
                        dir="rtl" 
                        className="font-arabic text-base sm:text-lg leading-loose text-stone-900 dark:text-stone-50 text-right py-1 font-normal"
                      >
                        {item.hadith.arabic}
                      </p>
                    )}

                    <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                      “{item.hadith.bangla}”
                    </p>
                  </div>
                )}

                {/* Interactive Practice / Completion Toggle Button */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    দৈনিক সুন্নাহ আমল চেক-ইন
                  </span>
                  <button
                    onClick={() => handleToggleSunnahPracticed(itemKey)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      isPracticed
                        ? 'bg-[#177a56] text-white shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[#177a56] dark:text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {isPracticed ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>✓ আজ আমল করা হয়েছে (+৫ কয়েন)</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>আমল সম্পন্ন করেছি (+৫ কয়েন)</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
