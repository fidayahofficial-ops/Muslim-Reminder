import React, { useState, useEffect } from 'react';
import { Sun, Moon, CheckCircle2, RotateCcw, Copy, Check } from 'lucide-react';
import { MORNING_EVENING_AZKAR } from '../data/duas';
import { toBengaliDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

export const AzkarView: React.FC = () => {
  const [timing, setTiming] = useState<'morning' | 'evening'>('morning');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scroll to top on mount and whenever tab/timing toggles
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [timing]);

  const handleTimingChange = (newTiming: 'morning' | 'evening') => {
    triggerHaptic(15);
    setTiming(newTiming);
  };

  const handleIncrement = (id: string, target: number) => {
    triggerHaptic(20);
    setCounts((prev) => {
      const current = prev[id] || 0;
      const next = current >= target ? target : current + 1;
      return { ...prev, [id]: next };
    });
  };

  const handleReset = (id: string) => {
    triggerHaptic(15);
    setCounts((prev) => ({ ...prev, [id]: 0 }));
  };

  const handleCopy = (azkar: any) => {
    triggerHaptic(20);
    const text = `${azkar.titleBn}\n\n${azkar.arabic}\n\nউচ্চারণ: ${azkar.transliteration}\nঅনুবাদ: ${azkar.translation}\nপাঠের সংখ্যা: ${toBengaliDigits(azkar.targetCount)} বার\nউৎস: ${azkar.reference || ''}${azkar.virtue ? `\nফজিলত: ${azkar.virtue}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(azkar.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentList = MORNING_EVENING_AZKAR.filter((a) => a.timing === timing);

  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* Switcher: Morning vs Evening */}
      <div className="p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl grid grid-cols-2">
        <button
          onClick={() => handleTimingChange('morning')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            timing === 'morning'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-800'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>সকালবেলার আজকার</span>
        </button>

        <button
          onClick={() => handleTimingChange('evening')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            timing === 'evening'
              ? 'bg-indigo-700 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-800'
          }`}
        >
          <Moon className="w-4 h-4" />
          <span>সন্ধ্যার আজকার</span>
        </button>
      </div>

      {/* Azkar Items */}
      <div className="space-y-4">
        {currentList.map((azkar) => {
          const currentCount = counts[azkar.id] || 0;
          const isCompleted = currentCount >= azkar.targetCount;
          const progressPercent = Math.min(100, Math.round((currentCount / azkar.targetCount) * 100));

          return (
            <article
              key={azkar.id}
              className={`p-4 rounded-2xl border transition-all shadow-sm space-y-3 ${
                isCompleted
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400/60'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  {azkar.titleBn}
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      সম্পন্ন
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(azkar)}
                    className="p-1 rounded-lg text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                    title="অনুলিপি (কপি) করুন"
                  >
                    {copiedId === azkar.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="text-xs sm:text-sm font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {toBengaliDigits(currentCount)} / {toBengaliDigits(azkar.targetCount)} বার
                  </span>
                </div>
              </div>

              {/* Arabic */}
              <p className="font-arabic text-right text-xl sm:text-2xl leading-loose text-stone-900 dark:text-stone-50 my-2">
                {azkar.arabic}
              </p>

              {/* Pronunciation & Translation */}
              <div className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 space-y-1.5">
                <p className="italic text-emerald-800 dark:text-emerald-400 font-medium leading-relaxed">
                  {azkar.transliteration}
                </p>
                <p className="leading-relaxed font-normal text-stone-900 dark:text-stone-100">
                  {azkar.translation}
                </p>
              </div>

              {/* Virtue */}
              {azkar.virtue && (
                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs text-stone-600 dark:text-stone-400 border border-stone-100 dark:border-stone-800">
                  <strong className="text-stone-800 dark:text-stone-200">ফজিলত: </strong>
                  {azkar.virtue}
                </div>
              )}

              {/* Reference */}
              {azkar.reference && (
                <div className="text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
                  উৎস: {azkar.reference}
                </div>
              )}

              {/* Progress Bar & Tap Button */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="flex-1 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleReset(azkar.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
                    title="রিসেট"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleIncrement(azkar.id, azkar.targetCount)}
                    disabled={isCompleted}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
                    }`}
                  >
                    {isCompleted ? 'সম্পূর্ণ' : 'ট্যাপ করুন (+১)'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
