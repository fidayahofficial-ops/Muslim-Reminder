import React, { useState } from 'react';
import { Compass, Volume2, ChevronDown, ChevronUp, Clock, ChevronRight } from 'lucide-react';
import { HAJJ_UMRAH_GUIDE } from '../data/hajjGuide';

interface HajjGuideViewProps {
  onOpenHajjCountdown?: () => void;
}

export const HajjGuideView: React.FC<HajjGuideViewProps> = ({ onOpenHajjCountdown }) => {
  const [selectedCategory, setSelectedCategory] = useState<'umrah' | 'hajj'>('umrah');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const guide = HAJJ_UMRAH_GUIDE.find(g => g.category === selectedCategory) || HAJJ_UMRAH_GUIDE[0];

  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            হজ ও উমরাহ পূর্ণাঙ্গ সহায়িকা
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            ধাপে ধাপে তালবিয়া, তাওয়াফ, সাঈ ও আহকাম
          </p>
        </div>
        {onOpenHajjCountdown && (
          <button
            type="button"
            onClick={onOpenHajjCountdown}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[#177a56] dark:text-emerald-300 text-xs font-bold flex items-center gap-1 border border-emerald-500/20 cursor-pointer shrink-0"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>হজ কাউন্টডাউন</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Switcher: Umrah vs Hajj */}
      <div className="p-1 bg-stone-100 dark:bg-stone-800 rounded-xl grid grid-cols-2">
        <button
          onClick={() => { setSelectedCategory('umrah'); setExpandedIndex(0); }}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            selectedCategory === 'umrah'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          উমরাহর নিয়ম (৪টি আমল)
        </button>
        <button
          onClick={() => { setSelectedCategory('hajj'); setExpandedIndex(0); }}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            selectedCategory === 'hajj'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          হজের দিনভিত্তিক আমল
        </button>
      </div>

      {/* Guide Steps */}
      <div className="space-y-3">
        {guide.steps.map((step, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={idx}
              className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800 space-y-3"
            >
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                  {step.titleBn}
                </h3>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-stone-400" /> : <ChevronDown className="w-5 h-5 text-stone-400" />}
              </div>

              {isExpanded && (
                <div className="space-y-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 text-sm">
                  <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                    {step.descriptionBn}
                  </p>

                  {step.arabic && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                      <p className="font-arabic text-right text-2xl sm:text-3xl text-stone-900 dark:text-stone-100 leading-loose">
                        {step.arabic}
                      </p>
                      {step.transliteration && (
                        <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 font-semibold italic">
                          {step.transliteration}
                        </p>
                      )}
                      {step.translation && (
                        <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 font-medium">
                          {step.translation}
                        </p>
                      )}
                    </div>
                  )}

                  <span className="text-[11px] text-stone-500 block pt-1">
                    রেফারেন্স: {step.reference}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
