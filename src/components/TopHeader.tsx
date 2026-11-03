import React from 'react';
import { Search, Compass, Sparkles, MapPin, Volume2, VolumeX, Cloud, RefreshCw, Flame, Award, Bell } from 'lucide-react';
import { District, UserSettings } from '../types';
import { useSync } from '../context/SyncContext';
import { toBengaliDigits } from '../utils/prayerTimes';
import { WaqtoLogo } from './WaqtoLogo';

interface TopHeaderProps {
  district: District;
  settings: UserSettings;
  streakDays?: number;
  totalPoints?: number;
  onOpenDistrictModal: () => void;
  onOpenSearch: () => void;
  onOpenDeenNavigator: () => void;
  onOpenCalendarReminders?: () => void;
  onToggleSound: () => void;
  onOpenQibla: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToRanking?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = React.memo(({
  district,
  settings,
  streakDays = 1,
  totalPoints = 120,
  onOpenDistrictModal,
  onOpenSearch,
  onOpenDeenNavigator,
  onOpenCalendarReminders,
  onToggleSound,
  onOpenQibla,
  onNavigateToProfile,
  onNavigateToRanking
}) => {
  const { user, syncStatus, signInWithGoogle } = useSync();
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
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131b17]/95 text-stone-900 dark:text-stone-100 backdrop-blur-md border-b border-emerald-950/10 dark:border-emerald-500/15 shadow-[0_2px_12px_rgba(23,122,86,0.04)] pt-[env(safe-area-inset-top,0px)] gpu-layer">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
        {/* Zone 1: Wordmark & Brand Identity */}
        <div onClick={handleSecretBrandTap} className="flex items-center gap-2 shrink-0">
          <WaqtoLogo size={36} className="shadow-xs" />
          <div className="flex flex-col justify-center">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-[#177a56] dark:text-emerald-400 select-none leading-tight">
              Muslim Reminder
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-stone-500 dark:text-stone-400 select-none leading-none mt-0.5">
              মুসলিম রিমাইন্ডার
            </span>
          </div>
        </div>

        {/* Zone 2: District Location Pill (Center) */}
        <button
          onClick={onOpenDistrictModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-500/20 text-xs text-[#177a56] dark:text-emerald-300 transition-colors truncate min-w-0 max-w-[110px] sm:max-w-[180px] cursor-pointer"
          title="স্থান বা জেলা পরিবর্তন করুন"
        >
          <MapPin className="w-3.5 h-3.5 text-[#177a56] dark:text-emerald-400 shrink-0" />
          <span className="truncate font-bold">{district.nameBn}</span>
        </button>

        {/* Zone 3: Points/Streak, Calendar Reminders, Search, Audio, and Sync */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Streak & Points Pill (Qalbee signature) */}
          <button
            onClick={onNavigateToRanking || onNavigateToProfile}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/50 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all cursor-pointer"
            title="আপনার স্ট্রিক ও দ্বীনি পয়েন্ট"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="font-mono tabular-nums">{toBengaliDigits(streakDays)} দিন</span>
          </button>

          {/* Islamic Special Days Calendar Reminder Bell with Yellow Badge */}
          {onOpenCalendarReminders && (
            <button
              onClick={onOpenCalendarReminders}
              className="relative p-1.5 rounded-lg text-stone-600 hover:text-[#177a56] hover:bg-emerald-50 dark:text-stone-300 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
              title="ইসলামী বিশেষ দিনের ক্যালেন্ডার রিমাইন্ডার"
              aria-label="ইসলামী বিশেষ দিনের রিমাইন্ডার"
            >
              <Bell className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-stone-950 font-mono text-[9px] font-black flex items-center justify-center shadow-2xs">
                1
              </span>
            </button>
          )}

          {/* Real-time Cloud Sync Button */}
          {user ? (
            <button
              onClick={onNavigateToProfile}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-500/30 text-[#177a56] dark:text-emerald-300 text-xs transition-colors cursor-pointer"
              title="রিয়েল-টাইম ক্লাউড সিঙ্ক সক্রিয়"
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <span className="text-[11px] font-bold hidden md:inline">সিঙ্কড</span>
            </button>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#177a56] hover:bg-[#126446] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="গুগল দিয়ে রিয়েল-টাইম সিঙ্ক চালু করুন"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-bold">সিঙ্ক</span>
            </button>
          )}

          {/* Global Search */}
          <button
            onClick={onOpenSearch}
            className="p-1.5 rounded-lg text-stone-600 hover:text-[#177a56] hover:bg-emerald-50 dark:text-stone-300 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
            title="অনুসন্ধান"
            aria-label="অনুসন্ধান করুন"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Audio toggle */}
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-lg text-stone-600 hover:text-[#177a56] hover:bg-emerald-50 dark:text-stone-300 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
            title={settings.soundEnabled ? 'সাউন্ড বন্ধ করুন' : 'সাউন্ড চালু করুন'}
            aria-label="সাউন্ড কন্ট্রোল"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
});

