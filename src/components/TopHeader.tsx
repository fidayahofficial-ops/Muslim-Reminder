import React from 'react';
import { MapPin, Flame, Bell } from 'lucide-react';
import { District, UserSettings } from '../types';
import { toBengaliDigits } from '../utils/prayerTimes';
import { WaqtoLogo } from './WaqtoLogo';

interface TopHeaderProps {
  district: District;
  settings?: UserSettings;
  streakDays?: number;
  totalPoints?: number;
  onOpenDistrictModal: () => void;
  onOpenSearch?: () => void;
  onOpenDeenNavigator?: () => void;
  onOpenCalendarReminders?: () => void;
  onToggleSound?: () => void;
  onOpenQibla?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToRanking?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = React.memo(({
  district,
  streakDays = 1,
  onOpenDistrictModal,
  onOpenCalendarReminders,
  onNavigateToProfile,
  onNavigateToRanking
}) => {
  const tapCountRef = React.useRef<number>(0);
  const tapTimerRef = React.useRef<number | null>(null);

  const handleSecretBrandTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      window.dispatchEvent(new CustomEvent('waqto-open-admin'));
      return;
    }
    tapTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0;
    }, 2000);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131b17]/95 text-stone-900 dark:text-stone-100 backdrop-blur-md border-b border-emerald-950/10 dark:border-emerald-500/15 shadow-[0_2px_12px_rgba(23,122,86,0.06)] pt-[env(safe-area-inset-top,0px)] gpu-layer">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 h-16 sm:h-18 flex items-center justify-between gap-2.5">
        {/* Zone 1: Wordmark & Brand Identity */}
        <div onClick={handleSecretBrandTap} className="flex items-center gap-2.5 shrink-0">
          <WaqtoLogo size={42} className="shadow-xs" />
          <div className="flex flex-col justify-center">
            <span className="text-base sm:text-lg font-black tracking-tight text-[#177a56] dark:text-emerald-400 select-none leading-none">
              Muslim Reminder
            </span>
            <span className="text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-300 select-none leading-snug mt-1">
              মুসলিম রিমাইন্ডার
            </span>
          </div>
        </div>

        {/* Zone 2: District Location Pill (Center) */}
        <button
          onClick={onOpenDistrictModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 border border-emerald-500/25 text-xs sm:text-sm text-[#177a56] dark:text-emerald-300 transition-colors shrink-0 cursor-pointer shadow-2xs font-black"
          title="স্থান বা জেলা পরিবর্তন করুন"
        >
          <MapPin className="w-4 h-4 text-[#177a56] dark:text-emerald-400 shrink-0" />
          <span>{district.nameBn}</span>
        </button>

        {/* Zone 3: Points/Streak and Calendar Reminders Notification Bell */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Streak & Points Pill */}
          <button
            onClick={onNavigateToRanking || onNavigateToProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 border border-amber-400/40 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-black transition-all cursor-pointer shadow-2xs"
            title="আপনার স্ট্রিক ও দ্বীনি পয়েন্ট"
          >
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="font-mono tabular-nums">{toBengaliDigits(streakDays)} দিন</span>
          </button>

          {/* Islamic Special Days Calendar Reminder Bell with Yellow Badge */}
          {onOpenCalendarReminders && (
            <button
              onClick={onOpenCalendarReminders}
              className="relative p-2 rounded-xl text-stone-700 hover:text-[#177a56] hover:bg-emerald-50 dark:text-stone-200 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
              title="ইসলামী বিশেষ দিনের ক্যালেন্ডার রিমাইন্ডার"
              aria-label="ইসলামী বিশেষ দিনের রিমাইন্ডার"
            >
              <Bell className="w-5 h-5 text-[#177a56] dark:text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-stone-950 font-mono text-[10px] font-black flex items-center justify-center shadow-2xs">
                1
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
});

