import React, { useState, useMemo } from 'react';
import { BookOpen, Copy, Bookmark, Share2, Check, Search, Sparkles, Calendar } from 'lucide-react';
import { AUTHENTIC_HADITHS } from '../data/hadiths';
import { HadithItem } from '../types';
import { toBengaliDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';
import { useSync } from '../context/SyncContext';
import { getDailyHadith } from '../utils/dailyHadith';

interface HadithViewProps {
  onOpenShareModal: (content: { title: string; arabic?: string; translation: string; reference: string }) => void;
}

export const HadithView: React.FC<HadithViewProps> = React.memo(({ onOpenShareModal }) => {
  const { saveBookmark } = useSync();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Today's date and daily rotated hadith
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const dailyHadith = useMemo(() => getDailyHadith(today), []);

  const filteredHadiths = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return AUTHENTIC_HADITHS;
    return AUTHENTIC_HADITHS.filter(h => (
      h.titleBn.toLowerCase().includes(q) ||
      h.translationBn.toLowerCase().includes(q) ||
      h.narratorBn.toLowerCase().includes(q) ||
      h.chapterBn.toLowerCase().includes(q)
    ));
  }, [searchQuery]);

  const handleCopy = (hadith: HadithItem) => {
    const text = `${hadith.titleBn}\n\n${hadith.arabic || ''}\n\n“${hadith.translationBn}”\n\nবর্ণনাকারী: ${hadith.narratorBn}\nউৎস: ${hadith.sourceBook}, হাদিস নং ${toBengaliDigits(hadith.hadithNo)} (${hadith.grade})\n\n― Muslim Reminder (মুসলিম রিমাইন্ডার)`;
    navigator.clipboard.writeText(text);
    setCopiedId(hadith.id);
    triggerHaptic(20);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBookmark = (hadith: HadithItem) => {
    const newBookmark = {
      id: `hadith_${hadith.id}`,
      type: 'hadith' as const,
      title: hadith.titleBn,
      subtitle: hadith.translationBn.slice(0, 60) + '...',
      reference: `${hadith.sourceBook} (${hadith.hadithNo})`,
      dataRefId: hadith.id,
      createdAt: Date.now()
    };
    saveBookmark(newBookmark);
    triggerHaptic(40);
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Header and Search */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#177a56] dark:text-emerald-400 shrink-0" />
            <span>সহিহ হাদিস সংকলন</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            প্রতিদিন বিশুদ্ধ হাদিস স্বয়ংক্রিয়ভাবে আপডেট হয় (ডাটা অন/অফ সর্বাবস্থায়)
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="হাদিস খুঁজুন (বিষয়, শব্দ বা সাহাবির নাম)..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm focus:outline-none focus:border-[#177a56] dark:text-stone-100 placeholder-stone-400 font-medium"
          />
        </div>
      </div>

      {/* 2. Today's Highlighted Daily Hadith Card */}
      {!searchQuery && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0c432f] text-white p-5 shadow-md border border-emerald-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs text-emerald-100 font-medium border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>আজকের নির্বাচিত হাদিস · <strong className="text-white">{todayFormatted}</strong></span>
            </div>
            <span className="text-[10px] font-bold bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full">
              দৈনিক আপডেট
            </span>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
              {dailyHadith.titleBn}
            </h3>
            <span className="text-xs sm:text-sm text-emerald-200 font-medium block mt-0.5">
              অধ্যায়: {dailyHadith.chapterBn}
            </span>
          </div>

          {dailyHadith.arabic && (
            <p dir="rtl" className="font-arabic text-xl sm:text-2xl text-emerald-100/90 leading-loose text-right border-y border-white/10 py-2.5 my-2.5 font-normal select-text">
              {dailyHadith.arabic}
            </p>
          )}

          <p className="text-base sm:text-lg text-emerald-50 leading-relaxed font-normal select-text">
            “{dailyHadith.translationBn}”
          </p>

          <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-emerald-200">
            <span>উৎস: <strong>{dailyHadith.sourceBook}</strong> ({toBengaliDigits(dailyHadith.hadithNo)}) · {dailyHadith.grade}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopy(dailyHadith)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="কপি করুন"
              >
                {copiedId === dailyHadith.id ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleBookmark(dailyHadith)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="বুকমার্ক করুন"
              >
                <Bookmark className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenShareModal({
                  title: dailyHadith.titleBn,
                  arabic: dailyHadith.arabic,
                  translation: dailyHadith.translationBn,
                  reference: `${dailyHadith.sourceBook}, হাদিস নং ${toBengaliDigits(dailyHadith.hadithNo)} (${dailyHadith.grade})`
                })}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="শেয়ার কার্ড বানান"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. All Hadith Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1 font-semibold">
          <span>সহিহ হাদিস সম্ভার</span>
          <span>{toBengaliDigits(filteredHadiths.length)}টি হাদিস</span>
        </div>

        {filteredHadiths.map((h) => {
          return (
            <article
              key={h.id}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs space-y-3 list-item-optimized"
            >
              <div className="flex items-start justify-between gap-2 border-b border-stone-100 dark:border-stone-800/80 pb-2.5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
                    {h.titleBn}
                  </h3>
                  <span className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium block mt-0.5">
                    অধ্যায়: {h.chapterBn} · বর্ণনায়: {h.narratorBn}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(h)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 cursor-pointer"
                    title="কপি করুন"
                  >
                    {copiedId === h.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleBookmark(h)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 cursor-pointer"
                    title="বুকমার্ক করুন"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenShareModal({
                      title: h.titleBn,
                      arabic: h.arabic,
                      translation: h.translationBn,
                      reference: `${h.sourceBook}, হাদিস নং ${toBengaliDigits(h.hadithNo)} (${h.grade})`
                    })}
                    className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 cursor-pointer"
                    title="শেয়ার কার্ড বানান"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Arabic */}
              {h.arabic && (
                <p dir="rtl" className="font-arabic text-xl sm:text-2xl leading-loose text-stone-900 dark:text-stone-50 text-right font-normal select-text">
                  {h.arabic}
                </p>
              )}

              {/* Bangla Translation */}
              <p className="text-base sm:text-lg text-stone-900 dark:text-stone-100 leading-relaxed font-normal select-text">
                “{h.translationBn}”
              </p>

              {/* Lesson if present */}
              {h.lessonBn && (
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/15 text-xs sm:text-sm text-[#177a56] dark:text-emerald-300 leading-relaxed">
                  <strong>শিক্ষা ও তাৎপর্য:</strong> {h.lessonBn}
                </div>
              )}

              {/* Footer */}
              <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium">
                <span>
                  সূত্র: <strong className="text-stone-800 dark:text-stone-200">{h.sourceBook}</strong> (নং {toBengaliDigits(h.hadithNo)})
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  {h.grade}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
});
