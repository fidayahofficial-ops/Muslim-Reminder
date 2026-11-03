import React, { useState, useMemo } from 'react';
import { Search, Share2, Bookmark, Copy, Check, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AUTHENTIC_DUAS, DUA_CATEGORIES } from '../data/duas';
import { DuaItem } from '../types';
import { toBengaliDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';
import { useSync } from '../context/SyncContext';
import { COIN_REWARDS } from '../utils/coins';

interface DuaViewProps {
  onOpenShareModal: (content: { title: string; arabic?: string; translation: string; reference: string }) => void;
}

export const DuaView: React.FC<DuaViewProps> = React.memo(({ onOpenShareModal }) => {
  const { saveBookmark, amalRecords, saveAmalRecord, publishedCmsContents } = useSync();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [counterState, setCounterState] = useState<Record<string, number>>({});
  const [coinNotification, setCoinNotification] = useState<string | null>(null);

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
    completedDuaKeys: []
  };

  const completedDuaSet = new Set(todayRecord.completedDuaKeys || []);

  const allDuas = useMemo<DuaItem[]>(() => {
    const remoteDuas: DuaItem[] = (publishedCmsContents || [])
      .filter((item) => item.type === 'dua')
      .map((item) => ({
        id: item.id,
        category: 'daily',
        categoryBn: item.categoryBn || 'দৈনন্দিন দোয়া',
        titleBn: item.titleBn,
        arabic: item.arabic || '',
        transliteration: item.transliteration || '',
        translation: item.translationBn,
        reference: item.reference || 'সহিহ হাদিস',
        sourceBook: item.reference || 'সহিহ সূত্র',
        grade: 'সহিহ',
        count: 1
      }));
    return [...remoteDuas, ...AUTHENTIC_DUAS];
  }, [publishedCmsContents]);

  // Filter duas memoized
  const filteredDuas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allDuas.filter(d => {
      const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        d.titleBn.toLowerCase().includes(q) ||
        d.translation.toLowerCase().includes(q) ||
        d.transliteration.toLowerCase().includes(q)
      );
    });
  }, [allDuas, selectedCategory, searchQuery]);

  const handleToggleDuaRecited = (duaId: string) => {
    triggerHaptic(25);
    const wasDone = completedDuaSet.has(duaId);
    let updatedKeys: string[];

    if (wasDone) {
      updatedKeys = (todayRecord.completedDuaKeys || []).filter(k => k !== duaId);
    } else {
      updatedKeys = [...(todayRecord.completedDuaKeys || []), duaId];
      setCoinNotification(`+${toBengaliDigits(COIN_REWARDS.DUA)} কয়েন অর্জিত! (দোয়া পাঠ)`);
      setTimeout(() => setCoinNotification(null), 2400);

      try {
        confetti({
          particleCount: 20,
          spread: 40,
          origin: { y: 0.8 },
          colors: ['#177a56', '#f59e0b', '#10b981']
        });
      } catch (e) {}
    }

    saveAmalRecord({
      ...todayRecord,
      duaDone: updatedKeys.length > 0,
      completedDuaKeys: updatedKeys
    });
  };

  const handleCopy = (dua: DuaItem) => {
    const text = `${dua.titleBn}\n\n${dua.arabic}\n\nউচ্চারণ: ${dua.transliteration}\nঅর্থ: ${dua.translation}\n\nউৎস: ${dua.reference} (${dua.grade || 'সহিহ'})`;
    navigator.clipboard.writeText(text);
    setCopiedId(dua.id);
    triggerHaptic(25);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBookmark = (dua: DuaItem) => {
    const newBookmark = {
      id: `dua_${dua.id}`,
      type: 'dua' as const,
      title: dua.titleBn,
      subtitle: dua.translation.slice(0, 60) + '...',
      reference: dua.reference,
      dataRefId: dua.id,
      createdAt: Date.now()
    };
    saveBookmark(newBookmark);
    triggerHaptic(40);
  };

  const handleIncrementCounter = (duaId: string, maxCount: number = 3) => {
    triggerHaptic(20);
    setCounterState(prev => {
      const current = prev[duaId] || 0;
      const next = current >= maxCount ? 0 : current + 1;
      return { ...prev, [duaId]: next };
    });
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="আয়াতুল কুরসি, দরুদ বা দোয়া খুঁজুন..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 text-xs sm:text-sm focus:outline-none focus:border-[#177a56] dark:text-stone-100 placeholder-stone-400 font-medium shadow-2xs"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {DUA_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#177a56] text-white shadow-xs'
                  : 'bg-white dark:bg-[#131b17] text-stone-700 dark:text-stone-300 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-stone-50'
              }`}
            >
              {cat.nameBn}
            </button>
          );
        })}
      </div>

      {/* Duas List */}
      <div className="space-y-4">
        {filteredDuas.map((dua) => {
          const currentCount = counterState[dua.id] || 0;
          const isRecited = completedDuaSet.has(dua.id);

          return (
            <article
              key={dua.id}
              className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs space-y-3 list-item-optimized"
            >
              {/* Header with Title and Action buttons */}
              <div className="flex items-start justify-between gap-2 border-b border-stone-100 dark:border-stone-800/80 pb-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                    {dua.titleBn}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
                    <span>{dua.categoryBn}</span>
                    {dua.grade && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#177a56] dark:text-emerald-400 font-bold">{dua.grade}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(dua)}
                    className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                    title="কপি করুন"
                  >
                    {copiedId === dua.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleBookmark(dua)}
                    className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                    title="বুকমার্ক করুন"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onOpenShareModal({
                      title: dua.titleBn,
                      arabic: dua.arabic,
                      translation: dua.translation,
                      reference: `${dua.reference} (${dua.grade || 'সহিহ'})`
                    })}
                    className="p-2 rounded-xl text-stone-400 hover:text-[#177a56] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 cursor-pointer"
                    title="শেয়ার কার্ড বানান"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Arabic Text */}
              <p dir="rtl" className="font-arabic text-right text-xl sm:text-2xl leading-loose text-stone-900 dark:text-stone-50 my-2 font-normal">
                {dua.arabic}
              </p>

              {/* Pronunciation */}
              <div className="bg-stone-50 dark:bg-stone-900/60 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-1">
                <span className="text-xs font-bold text-[#177a56] dark:text-emerald-400 block">উচ্চারণ:</span>
                <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                  {dua.transliteration}
                </p>
              </div>

              {/* Meaning */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">অর্থ:</span>
                <p className="text-xs sm:text-sm text-stone-900 dark:text-stone-100 leading-relaxed font-medium">
                  {dua.translation}
                </p>
              </div>

              {/* Virtue / Note */}
              {dua.note && (
                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/15 text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  <span className="font-bold text-[#177a56] dark:text-emerald-400">ফজিলত ও নির্দেশনা: </span>
                  {dua.note}
                </div>
              )}

              {/* Footer with Reference, Counter & Coin Check */}
              <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="text-stone-500 dark:text-stone-400 font-medium">
                  উৎস: {dua.reference}
                </span>

                <div className="flex items-center gap-2">
                  {dua.count && dua.count > 1 ? (
                    <button
                      onClick={() => handleIncrementCounter(dua.id, dua.count)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[#177a56] dark:text-emerald-300 font-mono text-xs font-bold cursor-pointer active:scale-95 transition-transform"
                    >
                      <span>{toBengaliDigits(currentCount)}/{toBengaliDigits(dua.count)} বার</span>
                    </button>
                  ) : null}

                  <button
                    onClick={() => handleToggleDuaRecited(dua.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      isRecited
                        ? 'bg-[#177a56] text-white shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[#177a56] dark:text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {isRecited ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>পাঠ সম্পন্ন (+৩)</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>পাঠ করেছি (+৩ কয়েন)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {filteredDuas.length === 0 && (
          <div className="text-center py-12 text-stone-500 text-sm font-medium">
            কোনো দোয়া পাওয়া যায়নি
          </div>
        )}
      </div>
    </div>
  );
});
