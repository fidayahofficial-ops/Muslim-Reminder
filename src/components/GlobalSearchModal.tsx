import React, { useState } from 'react';
import { X, Search, BookOpen, HeartHandshake, Compass, HelpCircle, Sparkles, Download } from 'lucide-react';
import { ALL_SURAHS_META } from '../data/quranSurahs';
import { AUTHENTIC_DUAS } from '../data/duas';
import { AUTHENTIC_HADITHS } from '../data/hadiths';
import { ALL_SUNNAH_ITEMS } from '../data/sunnahData';
import { toBengaliDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSurah: (surahNumber: number) => void;
  onNavigateToTab: (tab: 'quran' | 'duas' | 'prayers' | 'more') => void;
  onNavigateToSection?: (section: 'sunnah' | 'hadith' | 'tasbih' | 'qibla') => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSurah,
  onNavigateToTab,
  onNavigateToSection
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search Results
  const surahResults = q ? ALL_SURAHS_META.filter(s =>
    s.nameBengali.toLowerCase().includes(q) ||
    s.nameEnglish.toLowerCase().includes(q) ||
    s.meaningBengali.toLowerCase().includes(q) ||
    s.number.toString() === q
  ).slice(0, 4) : [];

  const duaResults = q ? AUTHENTIC_DUAS.filter(d =>
    d.titleBn.toLowerCase().includes(q) ||
    d.translation.toLowerCase().includes(q) ||
    d.transliteration.toLowerCase().includes(q)
  ).slice(0, 4) : [];

  const sunnahResults = q ? ALL_SUNNAH_ITEMS.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.subtitle.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.categoryTitle.toLowerCase().includes(q) ||
    s.points.some(p => p.toLowerCase().includes(q))
  ).slice(0, 3) : [];

  const hadithResults = q ? AUTHENTIC_HADITHS.filter(h =>
    h.titleBn.toLowerCase().includes(q) ||
    h.translationBn.toLowerCase().includes(q) ||
    h.narratorBn.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const isApkSearch = q && (q.includes('apk') || q.includes('app') || q.includes('download') || q.includes('ইনস্টল') || q.includes('অ্যাপ') || q.includes('ডাউনলোড'));

  const hasAnyResults = isApkSearch || surahResults.length > 0 || duaResults.length > 0 || sunnahResults.length > 0 || hadithResults.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="কুরআন, দোয়া, হাদিস বা আমল খুঁজুন..."
            className="w-full bg-transparent text-sm font-medium focus:outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-4">
          {!q && (
            <div className="text-center py-8 text-stone-400 text-xs">
              যেকোনো সূরা (যেমন: ফাতিহা, ইয়াসিন), দোয়া বা হাদিসের শব্দ লিখে অনুসন্ধান করুন
            </div>
          )}

          {q && !hasAnyResults && (
            <div className="text-center py-8 text-stone-400 text-xs">
              “{query}” দিয়ে কিছু পাওয়া যায়নি। বানান সঠিকভাবে লিখুন।
            </div>
          )}

          {/* Direct APK Download Match */}
          {isApkSearch && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Muslim Reminder অ্যান্ড্রয়েড অ্যাপ (Muslim Reminder.apk)
                </h4>
                <span className="text-[11px] text-stone-600 dark:text-stone-300">
                  সরাসরি APK ফাইল ডাউনলোড ও ইনস্টল করুন
                </span>
              </div>
              <a
                href="/waqto-app.apk"
                download="Muslim-Reminder.apk"
                className="px-3 py-1.5 rounded-xl bg-[#177a56] hover:bg-[#126446] text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>APK ডাউনলোড</span>
              </a>
            </div>
          )}

          {/* Surah Matches */}
          {surahResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                কুরআনের সূরা
              </span>
              <div className="space-y-1">
                {surahResults.map((s) => (
                  <div
                    key={s.number}
                    onClick={() => {
                      triggerHaptic(20);
                      onNavigateToSurah(s.number);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer flex items-center justify-between border border-transparent hover:border-stone-200"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        সূরা {s.nameBengali} ({s.nameEnglish})
                      </h4>
                      <span className="text-[10px] text-stone-400">
                        {s.meaningBengali} · {toBengaliDigits(s.versesCount)}টি আয়াত
                      </span>
                    </div>
                    <span className="font-arabic text-sm text-emerald-700 dark:text-emerald-300">
                      {s.nameArabic}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dua Matches */}
          {duaResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5" />
                প্রয়োজনীয় দোয়া
              </span>
              <div className="space-y-1">
                {duaResults.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      triggerHaptic(20);
                      onNavigateToTab('duas');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer space-y-1 border border-transparent hover:border-stone-200"
                  >
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {d.titleBn}
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-1">
                      {d.translation}
                    </p>
                    <span className="text-[10px] text-stone-400">
                      উৎস: {d.reference}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sunnah Matches */}
          {sunnahResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                দৈনন্দিন সুন্নাহ
              </span>
              <div className="space-y-1">
                {sunnahResults.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      triggerHaptic(20);
                      if (onNavigateToSection) {
                        onNavigateToSection('sunnah');
                      } else {
                        onNavigateToTab('more');
                      }
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer space-y-1 border border-transparent hover:border-stone-200"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {s.title}
                      </h4>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        {s.categoryTitle}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-1">
                      {s.description}
                    </p>
                    <span className="text-[10px] text-stone-400">
                      সূত্র: {s.hadith.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hadith Matches */}
          {hadithResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                সহিহ হাদিস
              </span>
              <div className="space-y-1">
                {hadithResults.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      triggerHaptic(20);
                      onNavigateToTab('more');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer space-y-1 border border-transparent hover:border-stone-200"
                  >
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {h.titleBn}
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-1">
                      “{h.translationBn}”
                    </p>
                    <span className="text-[10px] text-stone-400">
                      {h.sourceBook} (হাদিস: {toBengaliDigits(h.hadithNo)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
