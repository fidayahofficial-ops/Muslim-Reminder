import React, { useState, useRef } from 'react';
import { X, Copy, Download, Check, Share2, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    title: string;
    arabic?: string;
    translation: string;
    reference: string;
  } | null;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ isOpen, onClose, content }) => {
  const [selectedTheme, setSelectedTheme] = useState<'emerald' | 'dark' | 'navy' | 'gold'>('emerald');
  const [isCopied, setIsCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !content) return null;

  const themes = {
    emerald: 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 text-white border-emerald-700/50',
    dark: 'bg-gradient-to-br from-stone-900 via-stone-950 to-black text-white border-stone-800',
    navy: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-stone-950 text-white border-indigo-700/50',
    gold: 'bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-100 border-amber-600/40'
  };

  const handleCopyText = () => {
    const text = `${content.title}\n\n${content.arabic ? content.arabic + '\n\n' : ''}“${content.translation}”\n\nউৎস: ${content.reference}\n\n— ওয়াক্ত (WAQTO) : আপনার দ্বীনের সঙ্গী`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    triggerHaptic(25);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4 p-5">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-emerald-600" />
            ইসলামিক শেয়ার কার্ড
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Picker */}
        <div className="flex items-center justify-center gap-2">
          {(['emerald', 'dark', 'navy', 'gold'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                triggerHaptic(15);
                setSelectedTheme(t);
              }}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all cursor-pointer ${
                selectedTheme === t ? 'ring-2 ring-emerald-500 scale-105 font-bold' : 'opacity-70 hover:opacity-100'
              } ${
                t === 'emerald'
                  ? 'bg-emerald-900 text-white'
                  : t === 'dark'
                  ? 'bg-stone-900 text-white'
                  : t === 'navy'
                  ? 'bg-indigo-900 text-white'
                  : 'bg-amber-900 text-amber-100'
              }`}
            >
              {t === 'emerald' ? 'এমেরাল্ড' : t === 'dark' ? 'ডার্ক' : t === 'navy' ? 'নেভি' : 'গোল্ড'}
            </button>
          ))}
        </div>

        {/* The Visual Share Card */}
        <div
          ref={cardRef}
          className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden space-y-4 text-center ${themes[selectedTheme]}`}
        >
          {/* Subtle Islamic Motif Border Accent */}
          <div className="flex items-center justify-between text-[11px] opacity-75 pb-2 border-b border-white/10">
            <span>{content.title}</span>
            <div className="flex items-center gap-1 text-amber-300">
              <Sparkles className="w-3 h-3" />
              <span>Muslim Reminder</span>
            </div>
          </div>

          {/* Arabic Text */}
          {content.arabic && (
            <p className="font-arabic text-xl sm:text-2xl leading-loose font-normal py-1">
              {content.arabic}
            </p>
          )}

          {/* Translation */}
          <p className="text-xs sm:text-sm leading-relaxed opacity-95 font-normal px-2">
            “{content.translation}”
          </p>

          {/* Reference & App watermark */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] opacity-80">
            <span>উৎস: {content.reference}</span>
            <span className="font-semibold text-emerald-300">Muslim Reminder — মুসলিম রিমাইন্ডার</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCopyText}
            className="w-full py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {isCopied ? 'কপি হয়েছে' : 'টেক্সট কপি করুন'}
          </button>

          <button
            onClick={() => {
              handleCopyText();
              alert('কার্ডের লেখা কপি করা হয়েছে! আপনি এটি যেকোনো সোশ্যাল মিডিয়ায় পোস্ট করতে পারেন।');
            }}
            className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Share2 className="w-4 h-4" />
            শেয়ার করুন
          </button>
        </div>
      </div>
    </div>
  );
};
