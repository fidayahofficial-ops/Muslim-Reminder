import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Flame, 
  Calendar, 
  BookOpen, 
  Heart, 
  Sparkles, 
  Cloud, 
  RefreshCw, 
  LogIn,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Check,
  X,
  Coins,
  HelpCircle,
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DailyAmalRecord, PrayerTimes } from '../types';
import { toBengaliDigits, getPrayerWaqtStatus } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';
import { useSync } from '../context/SyncContext';
import { COIN_REWARDS } from '../utils/coins';
import { hasLaterPrayerBeenMarked, PrayerKey } from '../utils/amalCheck';

interface AmalTrackerViewProps {
  currentRecord: DailyAmalRecord;
  onUpdateRecord: (updated: DailyAmalRecord) => void;
  prayers?: PrayerTimes;
  currentTime?: Date;
  onNavigateSection?: (section: any) => void;
  calculateMissedPrayers?: (
    record: DailyAmalRecord,
    prayers: PrayerTimes,
    currentDate?: Date
  ) => Array<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'>;
}

export const AmalTrackerView: React.FC<AmalTrackerViewProps> = React.memo(({ 
  currentRecord, 
  onUpdateRecord,
  prayers,
  currentTime = new Date(),
  onNavigateSection,
  calculateMissedPrayers
}) => {
  const { user, syncStatus, signInWithGoogle, saveAmalRecord, amalRecords } = useSync();
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [coinNotification, setCoinNotification] = useState<string | null>(null);
  const [lockedWarning, setLockedWarning] = useState<string | null>(null);
  const [fivePrayersCelebrated, setFivePrayersCelebrated] = useState<boolean>(false);
  const [dailyPageGoal, setDailyPageGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('waqto_khatam_daily_goal_v1');
      return saved ? Math.max(1, Number(saved)) : 4;
    } catch {
      return 4;
    }
  });

  const prayerDefs = [
    { key: 'fajr' as const, nameBn: 'ফজর', subBn: 'সুবহে সাদিকের ফরজ ও সুন্নাত সালাত' },
    { key: 'dhuhr' as const, nameBn: 'যোহর', subBn: 'মধ্যাহ্নকালীন ফরজ ও সুন্নাত সালাত' },
    { key: 'asr' as const, nameBn: 'আসর', subBn: 'অপরাহ্নকালীন ফরজ সালাত' },
    { key: 'maghrib' as const, nameBn: 'মাগরিব', subBn: 'সূর্যাস্ত পরবর্তী ফরজ ও সুন্নাত সালাত' },
    { key: 'isha' as const, nameBn: 'এশা', subBn: 'রাত্রিকালীন ফরজ, সুন্নাত ও বিতর সালাত' }
  ];

  // Resolve target date key for offset
  const viewingDate = new Date();
  viewingDate.setDate(viewingDate.getDate() + selectedDayOffset);
  const dateKey = `${viewingDate.getFullYear()}-${String(viewingDate.getMonth() + 1).padStart(2, '0')}-${String(viewingDate.getDate()).padStart(2, '0')}`;

  const activeRecord: DailyAmalRecord = selectedDayOffset === 0 
    ? currentRecord 
    : (amalRecords[dateKey] || {
        dateKey,
        prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
        morningAzkarDone: false,
        eveningAzkarDone: false,
        fastingDone: false,
        sadaqahDone: false,
        tasbihCount: 0,
        quranPagesRead: 0,
        sunnahDone: false,
        duaDone: false,
        quizDone: false
      });

  const showCoinToast = (text: string) => {
    setCoinNotification(text);
    setTimeout(() => setCoinNotification(null), 2400);
  };

  const showLockedWarning = (text: string) => {
    setLockedWarning(text);
    setTimeout(() => setLockedWarning(null), 3200);
  };

  const handleTogglePrayer = async (key: keyof DailyAmalRecord['prayers']) => {
    const wasDone = !!activeRecord.prayers[key];

    // If attempting to mark an uncompleted prayer, but a subsequent waqt has already been marked done:
    if (!wasDone && hasLaterPrayerBeenMarked(key as PrayerKey, activeRecord.prayers)) {
      triggerHaptic([70, 50, 70]);
      showLockedWarning('পরবর্তী ওয়াক্তের সালাত আদায় চিহ্নিত করায় পূর্বের সালাতটি আর চিহ্নিত করা যাবে না');
      return;
    }

    // If attempting to unmark a prior prayer when a subsequent waqt is marked done:
    if (wasDone && hasLaterPrayerBeenMarked(key as PrayerKey, activeRecord.prayers)) {
      triggerHaptic([70, 50, 70]);
      showLockedWarning('পরবর্তী ওয়াক্তের সালাত আদায় থাকায় পূর্বের আদায়কৃত সালাত পরিবর্তন করা যাবে না');
      return;
    }

    triggerHaptic(20);
    const updated: DailyAmalRecord = {
      ...activeRecord,
      prayers: {
        ...activeRecord.prayers,
        [key]: !wasDone
      }
    };
    if (selectedDayOffset === 0) {
      onUpdateRecord(updated);
    }
    await saveAmalRecord(updated);

    if (!wasDone) {
      const completedAllFive =
        Boolean(updated.prayers.fajr) &&
        Boolean(updated.prayers.dhuhr) &&
        Boolean(updated.prayers.asr) &&
        Boolean(updated.prayers.maghrib) &&
        Boolean(updated.prayers.isha);

      if (completedAllFive) {
        triggerHaptic([30, 50, 40]);
        setFivePrayersCelebrated(true);
        setTimeout(() => setFivePrayersCelebrated(false), 4200);
        showCoinToast(`মাশাআল্লাহ! ৫ ওয়াক্ত পূর্ণ (+${toBengaliDigits(COIN_REWARDS.PRAYER)} কয়েন) ✨`);
        try {
          // Subtle dual-angle golden & emerald particle celebration
          confetti({
            particleCount: 28,
            angle: 65,
            spread: 52,
            origin: { x: 0.25, y: 0.72 },
            scalar: 0.85,
            gravity: 0.85,
            ticks: 170,
            colors: ['#f59e0b', '#fbbf24', '#10b981', '#177a56', '#fde68a']
          });
          setTimeout(() => {
            try {
              confetti({
                particleCount: 28,
                angle: 115,
                spread: 52,
                origin: { x: 0.75, y: 0.72 },
                scalar: 0.85,
                gravity: 0.85,
                ticks: 170,
                colors: ['#f59e0b', '#fbbf24', '#10b981', '#177a56', '#fde68a']
              });
            } catch (e) {}
          }, 160);
        } catch (e) {}
      } else {
        showCoinToast(`+${toBengaliDigits(COIN_REWARDS.PRAYER)} কয়েন অর্জিত! (সালাত আদায়)`);
        try {
          confetti({
            particleCount: 16,
            spread: 38,
            scalar: 0.75,
            origin: { y: 0.8 },
            colors: ['#177a56', '#10b981', '#f59e0b']
          });
        } catch (e) {}
      }
    }
  };

  const handleToggleField = async (
    field: 'morningAzkarDone' | 'eveningAzkarDone' | 'fastingDone' | 'sadaqahDone' | 'sunnahDone' | 'duaDone' | 'quizDone',
    coinAmount: number,
    labelBn: string
  ) => {
    triggerHaptic(20);
    const wasDone = !!activeRecord[field];
    const updated: DailyAmalRecord = {
      ...activeRecord,
      [field]: !wasDone
    };
    if (selectedDayOffset === 0) {
      onUpdateRecord(updated);
    }
    await saveAmalRecord(updated);

    if (!wasDone) {
      showCoinToast(`+${toBengaliDigits(coinAmount)} কয়েন অর্জিত! (${labelBn})`);
      try {
        confetti({
          particleCount: 20,
          spread: 40,
          origin: { y: 0.8 },
          colors: ['#177a56', '#f59e0b', '#10b981']
        });
      } catch (e) {}
    }
  };

  const handleUpdateQuranPages = async (newPageCount: number) => {
    const clamped = Math.max(0, Math.min(604, Math.floor(newPageCount)));
    const prevPages = activeRecord.quranPagesRead || 0;
    if (clamped === prevPages) return;

    triggerHaptic(20);
    const updated: DailyAmalRecord = {
      ...activeRecord,
      quranPagesRead: clamped
    };
    if (selectedDayOffset === 0) {
      onUpdateRecord(updated);
    }
    await saveAmalRecord(updated);

    if (clamped > prevPages) {
      const diff = clamped - prevPages;
      showCoinToast(`+${toBengaliDigits(diff * COIN_REWARDS.QURAN_PAGE)} কয়েন অর্জিত! (${toBengaliDigits(diff)} পৃষ্ঠা তিলাওয়াত)`);
      try {
        confetti({
          particleCount: clamped >= dailyPageGoal ? 40 : 20,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#177a56', '#f59e0b', '#10b981']
        });
      } catch (e) {}
    }
  };

  const handleUpdateDailyPageGoal = (goal: number) => {
    triggerHaptic(15);
    setDailyPageGoal(goal);
    try {
      localStorage.setItem('waqto_khatam_daily_goal_v1', String(goal));
    } catch {}
  };

  // Quran Khatam calculations (604 pages standard Madani Mushaf)
  const MUSHAF_TOTAL_PAGES = 604;
  const todayPagesRead = activeRecord.quranPagesRead || 0;
  const totalPagesAllDays = Object.values({
    ...amalRecords,
    [dateKey]: activeRecord
  }).reduce((sum, rec) => sum + (Number(rec?.quranPagesRead) || 0), 0);

  const completedKhatams = Math.floor(totalPagesAllDays / MUSHAF_TOTAL_PAGES);
  const currentKhatamPages =
    totalPagesAllDays > 0 && totalPagesAllDays % MUSHAF_TOTAL_PAGES === 0
      ? MUSHAF_TOTAL_PAGES
      : totalPagesAllDays % MUSHAF_TOTAL_PAGES;
  const khatamPercentage = Math.min(100, Math.round((currentKhatamPages / MUSHAF_TOTAL_PAGES) * 100));
  const currentJuz = currentKhatamPages === 0 ? 1 : Math.min(30, Math.ceil(currentKhatamPages / 20.14));
  const remainingKhatamPages = Math.max(0, MUSHAF_TOTAL_PAGES - currentKhatamPages);
  const estimatedDaysToKhatam = Math.ceil(remainingKhatamPages / Math.max(1, dailyPageGoal));
  const dailyQuranGoalPercent = Math.min(100, Math.round((todayPagesRead / Math.max(1, dailyPageGoal)) * 100));

  // Determine if a general deed was missed
  const isPastDay = selectedDayOffset < 0;
  const currentHour = currentTime.getHours();

  const isFieldMissed = (
    field: 'morningAzkarDone' | 'eveningAzkarDone' | 'fastingDone' | 'sadaqahDone' | 'sunnahDone' | 'duaDone' | 'quizDone'
  ): boolean => {
    const isDone = !!activeRecord[field];
    if (isDone) return false;
    if (isPastDay) return true; // Past day and not completed = Missed (Red)

    // Today's timeline:
    if (field === 'morningAzkarDone') {
      return currentHour >= 13; // Past 1 PM (Dhuhr elapsed)
    }
    if (field === 'eveningAzkarDone' || field === 'sunnahDone' || field === 'quizDone') {
      return currentHour >= 22; // Late night 10 PM
    }
    return false;
  };

  // Completion calculation:
  // Instead of showing all previous prayers as 'missed' regardless of the actual date,
  // only flag a prayer as missed if the current date matches the record date
  // and the time has passed without the user marking it as done.
  const isViewingToday = selectedDayOffset === 0;
  let completedPrayersCount = 0;
  let missedPrayersCount = 0;

  const todayMissedList = isViewingToday && prayers && calculateMissedPrayers
    ? calculateMissedPrayers(activeRecord, prayers, currentTime)
    : [];

  prayerDefs.forEach((p) => {
    const isDone = !!activeRecord.prayers[p.key];
    if (isDone) {
      completedPrayersCount++;
    } else if (isViewingToday && todayMissedList.includes(p.key)) {
      missedPrayersCount++;
    }
  });

  let completedTasksCount = completedPrayersCount;
  const totalTasks = 5 + 7; // 5 prayers + Quran reading + 6 deeds
  if ((activeRecord.quranPagesRead || 0) > 0) completedTasksCount++;
  if (activeRecord.morningAzkarDone) completedTasksCount++;
  if (activeRecord.eveningAzkarDone) completedTasksCount++;
  if (activeRecord.sunnahDone) completedTasksCount++;
  if (activeRecord.quizDone) completedTasksCount++;
  if (activeRecord.fastingDone) completedTasksCount++;
  if (activeRecord.sadaqahDone) completedTasksCount++;

  const percentage = Math.round((completedTasksCount / totalTasks) * 100);

  // Consecutive days streak
  const streakDays = Object.keys(amalRecords).length > 0 ? Math.max(1, Object.keys(amalRecords).length) : 1;

  const dateFormattedBn = viewingDate.toLocaleDateString('bn-BD', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate 7-day strip (Last 7 days including today)
  const weekDays = [-6, -5, -4, -3, -2, -1, 0].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const rec = offset === 0 ? currentRecord : (amalRecords[dKey] || { prayers: {} });
    const dayNameBn = d.toLocaleDateString('bn-BD', { weekday: 'narrow' });
    const dayNumberBn = toBengaliDigits(d.getDate());

    let completed = 0;
    let missed = 0;
    prayerDefs.forEach((p) => {
      const isDone = !!rec.prayers?.[p.key];
      if (isDone) completed++;
      else if (offset === 0 && prayers && calculateMissedPrayers) {
        if (calculateMissedPrayers(rec, prayers, currentTime).includes(p.key)) {
          missed++;
        }
      }
    });

    return {
      offset,
      dateKey: dKey,
      dayNameBn,
      dayNumberBn,
      completed,
      missed,
      isSelected: selectedDayOffset === offset
    };
  });

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* Floating Coin Toast (Yellow Frosted Glass) */}
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

      {/* Floating Locked Prayer Toast */}
      {lockedWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] animate-fade-in pointer-events-auto">
          <div className="px-4 py-3 rounded-2xl bg-rose-600 dark:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2.5 shadow-2xl border border-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0 stroke-[2.5]" />
            <span className="flex-1">{lockedWarning}</span>
            <button onClick={() => setLockedWarning(null)} className="p-1 hover:bg-white/20 rounded-lg shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Header with Day Switcher */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDayOffset((prev) => prev - 1)}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
            title="পূর্ববর্তী দিন"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              <Calendar className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
              <span>{selectedDayOffset === 0 ? 'আজকের আমল' : selectedDayOffset === -1 ? 'গতকালের আমল' : dateFormattedBn}</span>
            </div>
            {selectedDayOffset !== 0 ? (
              <button
                onClick={() => setSelectedDayOffset(0)}
                className="text-[10px] text-[#177a56] dark:text-emerald-400 font-bold underline mt-0.5 cursor-pointer"
              >
                আজকে ফিরে আসুন
              </button>
            ) : (
              <span className="text-[10px] text-stone-400 font-medium">দিনের শেষে আদায় না হওয়া সালাত লাল রঙে ফ্ল্যাগড</span>
            )}
          </div>

          <button
            onClick={() => setSelectedDayOffset((prev) => Math.min(0, prev + 1))}
            disabled={selectedDayOffset >= 0}
            className={`p-2 rounded-xl transition-colors ${
              selectedDayOffset >= 0 
                ? 'opacity-30 cursor-not-allowed text-stone-400' 
                : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer'
            }`}
            title="পরবর্তী দিন"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 7-Day Mini Calendar Strip with Green (Done) & Red (Missed) Visual Flags */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80">
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {weekDays.map((wd) => (
              <button
                key={wd.dateKey}
                onClick={() => setSelectedDayOffset(wd.offset)}
                className={`py-2 px-1 rounded-2xl transition-all cursor-pointer select-none flex flex-col items-center justify-between gap-1 ${
                  wd.isSelected
                    ? 'bg-[#177a56] text-white shadow-xs scale-103'
                    : 'bg-stone-50 dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <span className={`text-[10px] font-semibold ${wd.isSelected ? 'text-emerald-100' : 'text-stone-400'}`}>
                  {wd.dayNameBn}
                </span>
                <span className={`text-xs font-mono font-bold ${wd.isSelected ? 'text-white' : 'text-stone-800 dark:text-stone-200'}`}>
                  {wd.dayNumberBn}
                </span>

                {/* 5-Prayer Mini Dots Status: Green = Prayed, Red = Missed */}
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: 5 }).map((_, dotIdx) => {
                    const isDone = dotIdx < wd.completed;
                    const isMiss = !isDone && dotIdx < (wd.completed + wd.missed);
                    return (
                      <span
                        key={dotIdx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDone
                            ? wd.isSelected ? 'bg-amber-300' : 'bg-emerald-500'
                            : isMiss
                            ? 'bg-rose-500 ring-1 ring-rose-400'
                            : wd.isSelected ? 'bg-white/20' : 'bg-stone-200 dark:bg-stone-700'
                        }`}
                        title={isDone ? 'আদায়কৃত' : isMiss ? 'মিসড' : 'বাকি'}
                      />
                    );
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Missed Prayers Alert Banner if any missed today */}
      {isViewingToday && missedPrayersCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              ওয়াক্ত সমাপ্ত হওয়ায় <strong className="font-extrabold text-rose-700 dark:text-rose-300">{toBengaliDigits(missedPrayersCount)}টি সালাত মিসড</strong> হয়েছে
            </span>
          </div>
          <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
            কাজা আদায় করুন
          </span>
        </div>
      )}

      {/* 2. Hero Progress & Streak Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0d4430] text-white p-5 shadow-lg border border-emerald-500/20 space-y-3">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 border border-white/10 rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">দৈনিক আত্মপর্যালোচনা</span>
              <span className="text-[10px] font-bold bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Coins className="w-3 h-3 fill-stone-900" />
                +{toBengaliDigits(COIN_REWARDS.PRAYER)} কয়েন/সালাত
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5 leading-snug">
              আমল ট্র্যাকার
            </h2>
          </div>
          <div className="text-right">
            <span className="text-3xl sm:text-4xl font-black font-mono text-amber-300 tabular-nums drop-shadow-xs">
              {toBengaliDigits(percentage)}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 space-y-1.5">
          <div className="h-2.5 w-full bg-emerald-950/70 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-300 via-amber-300 to-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-100 font-medium">
            <span>লক্ষ্যের মধ্যে <strong className="text-amber-300 font-bold">{toBengaliDigits(completedTasksCount)}টি</strong> সম্পন্ন</span>
            <span className={`flex items-center gap-1 font-bold transition-all ${completedPrayersCount >= 5 ? 'animate-pulse-soft text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-lg ring-1 ring-amber-300/40' : 'text-amber-200'}`}>
              <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              {toBengaliDigits(streakDays)} দিনের স্ট্রিক {completedPrayersCount >= 5 && '🔥'}
            </span>
          </div>
        </div>

        {/* Cloud Sync Status Ribbon */}
        <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
          {user ? (
            <div className="flex items-center gap-1.5 text-emerald-100 font-semibold">
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              )}
              <span>ক্লাউড সিঙ্ক সক্রিয় ({user.email?.split('@')[0]})</span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-emerald-100">
              <span className="flex items-center gap-1 font-medium">
                <Cloud className="w-3.5 h-3.5" />
                ডিভাইসে সংরক্ষিত
              </span>
              <button
                onClick={() => signInWithGoogle()}
                className="text-amber-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                ক্লাউড সিঙ্ক
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. 5 Daily Prayers Checklist (Missed prayers visually flagged as RED) */}
      <div className={`relative overflow-hidden bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border transition-all duration-500 space-y-3 ${
        completedPrayersCount >= 5
          ? 'border-amber-400/60 dark:border-amber-500/40 ring-1 ring-amber-400/25 shadow-[0_6px_24px_rgba(245,158,11,0.08)]'
          : 'border-emerald-950/8 dark:border-emerald-500/15'
      }`}>
        {/* Subtle floating celebration particles when all 5 prayers are completed */}
        {(fivePrayersCelebrated || completedPrayersCount >= 5) && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 overflow-hidden">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-56 h-16 bg-gradient-to-b from-amber-400/15 via-emerald-400/10 to-transparent blur-xl" />
            {fivePrayersCelebrated && (
              <>
                <span className="absolute top-3 left-[14%] w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="absolute top-5 left-[32%] w-2 h-2 rounded-full bg-emerald-400/80 animate-bounce" />
                <span className="absolute top-3 right-[28%] w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                <span className="absolute top-6 right-[14%] w-2 h-2 rounded-full bg-emerald-500/70 animate-bounce" />
              </>
            )}
          </div>
        )}

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              completedPrayersCount >= 5
                ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400'
            }`}>
              {completedPrayersCount >= 5 ? (
                <Sparkles className="w-4 h-4 fill-stone-950" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-none">
                  ৫ ওয়াক্ত ফরজ সালাত
                </h3>
                {completedPrayersCount >= 5 && (
                  <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/60 animate-pulse-soft">
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                    আলহামদুলিল্লাহ পূর্ণ!
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 font-medium">
                {completedPrayersCount >= 5
                  ? 'মাশাআল্লাহ! আজকের ৫ ওয়াক্ত ফরজ সালাতই আদায় সম্পন্ন হয়েছে'
                  : 'দিনের শেষে আদায় না হওয়া প্রতিটি সালাত লাল রঙে ফ্ল্যাগড থাকে'}
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full font-mono transition-colors ${
            completedPrayersCount >= 5
              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/40'
              : 'text-[#177a56] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
          }`}>
            {toBengaliDigits(completedPrayersCount)}/৫
          </span>
        </div>

        <div className="space-y-2.5">
          {prayerDefs.map((p) => {
            const isDone = !!activeRecord.prayers[p.key];
            const isLocked = !isDone && hasLaterPrayerBeenMarked(p.key, activeRecord.prayers);
            let isMissed = isLocked;
            let isCurrent = false;

            if (!isDone && !isLocked) {
              // Only flag as missed if the current date matches the record date and the time has passed without being marked done
              if (isViewingToday && prayers) {
                isMissed = todayMissedList.includes(p.key);
                const status = getPrayerWaqtStatus(p.key, prayers, false, currentTime);
                isCurrent = status === 'current';
              }
              // Previous dates are NOT shown as missed regardless of the actual date
            }

            let cardStyle = 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:bg-emerald-50/40 font-medium';
            let circleStyle = 'border-2 border-stone-300 dark:border-stone-700 text-transparent';
            let badgeStyle = 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400';
            let badgeText = isViewingToday ? 'বাকি আছে' : 'অনাদায়ী';
            let subText = isViewingToday ? p.subBn : 'এই তারিখে সালাত আদায় হিসেবে চিহ্নিত নেই';

            if (isDone) {
              cardStyle = 'bg-emerald-50/90 dark:bg-emerald-950/50 border-2 border-[#177a56]/60 dark:border-emerald-600/60 text-[#177a56] dark:text-emerald-200 font-bold shadow-xs';
              circleStyle = 'bg-[#177a56] text-white shadow-xs';
              badgeStyle = 'bg-[#177a56] text-white';
              badgeText = 'আদায় সম্পন্ন (+১৫)';
              subText = 'আলহামদুলিল্লাহ! সালাত আদায় সম্পন্ন';
            } else if (isLocked) {
              cardStyle = 'bg-rose-50/70 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-stone-700 dark:text-stone-300 cursor-not-allowed opacity-90';
              circleStyle = 'bg-rose-500 text-white shadow-xs';
              badgeStyle = 'bg-rose-600 text-white font-extrabold shadow-xs';
              badgeText = 'মিসড (লক)';
              subText = 'পরবর্তী ওয়াক্তের সালাত আদায় চিহ্নিত করায় এটি মিসড হিসেবে সংরক্ষিত (আর চিহ্নিত করা যাবে না)';
            } else if (isMissed) {
              // Prominently flagged in RED COLOR only if current date matches record date and time has passed
              cardStyle = 'bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-500 dark:border-rose-600 text-rose-900 dark:text-rose-100 font-bold shadow-sm ring-2 ring-rose-500/20';
              circleStyle = 'bg-rose-600 text-white shadow-xs';
              badgeStyle = 'bg-rose-600 text-white font-extrabold shadow-xs';
              badgeText = 'মিসড';
              subText = 'আজকের ওয়াক্ত উত্তীর্ণ হওয়ায় মিসড হিসেবে সংরক্ষিত';
            } else if (isCurrent) {
              cardStyle = 'bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold shadow-xs ring-2 ring-emerald-500/20';
              circleStyle = 'border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300';
              badgeStyle = 'bg-emerald-600 text-white font-bold';
              badgeText = 'চলতি ওয়াক্ত';
              subText = 'এখন এই সালাতের ওয়াক্ত চলছে (আদায় করতে ট্যাপ করুন)';
            }

            return (
              <button
                key={p.key}
                onClick={() => handleTogglePrayer(p.key)}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all select-none ${cardStyle} ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${circleStyle}`}>
                    {isDone ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : isMissed ? (
                      <X className="w-4 h-4 stroke-[3]" />
                    ) : null}
                  </div>
                  <div className="text-left">
                    <span className="text-base sm:text-lg font-black block leading-snug">
                      {p.nameBn}
                    </span>
                    <span className={`text-xs sm:text-sm block mt-0.5 leading-relaxed font-semibold ${isMissed ? 'text-rose-700 dark:text-rose-300 font-bold' : 'text-stone-600 dark:text-stone-300'}`}>
                      {subText}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs sm:text-sm px-3 py-1 rounded-full font-black ${badgeStyle}`}>
                    {badgeText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3.5. Daily Quran Khatam Progress & Page Logger */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-[#177a56] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-none">
                  দৈনিক কুরআন খতম অগ্রগতি
                </h3>
                <span className="text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-300/60 dark:border-amber-700/50">
                  +{toBengaliDigits(COIN_REWARDS.QURAN_PAGE)} কয়েন/পৃষ্ঠা
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 font-medium">
                পবিত্র কুরআনের ৬০৪ পৃষ্ঠা (৩০ পারা) খতমের ধারাবাহিক হিসাব
              </p>
            </div>
          </div>

          {completedKhatams > 0 && (
            <div className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-700 dark:text-amber-300 text-xs font-extrabold flex items-center gap-1 shrink-0">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>{toBengaliDigits(completedKhatams)}টি খতম সম্পন্ন</span>
            </div>
          )}
        </div>

        {/* Overall 604-Page Khatam Progress Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-amber-500/10 dark:from-emerald-950/50 dark:via-stone-900/60 dark:to-amber-950/30 border border-emerald-500/20 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-stone-800 dark:text-stone-100">
                চলমান খতম:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#177a56] text-white font-bold text-[11px]">
                পারা {toBengaliDigits(currentJuz)}/৩০
              </span>
              <span className="text-stone-500 dark:text-stone-400 font-medium text-[11px]">
                ({toBengaliDigits(currentKhatamPages)} / {toBengaliDigits(MUSHAF_TOTAL_PAGES)} পৃষ্ঠা)
              </span>
            </div>
            <span className="text-sm font-black font-mono text-[#177a56] dark:text-emerald-400">
              {toBengaliDigits(khatamPercentage)}%
            </span>
          </div>

          {/* Khatam Progress Bar */}
          <div className="h-2.5 w-full bg-stone-200/80 dark:bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#177a56] via-emerald-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(todayPagesRead > 0 ? 2 : 0, khatamPercentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-400 font-medium">
            <span>
              খতম পূর্ণ হতে বাকি: <strong className="text-stone-900 dark:text-stone-200 font-bold">{toBengaliDigits(remainingKhatamPages)} পৃষ্ঠা</strong>
            </span>
            <span>
              সম্ভাব্য সময়: <strong className="text-[#177a56] dark:text-emerald-400 font-bold">~{toBengaliDigits(estimatedDaysToKhatam)} দিন</strong>
            </span>
          </div>
        </div>

        {/* Today's / Selected Day's Page Logger Controls */}
        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 block">
                {selectedDayOffset === 0 ? 'আজকের তিলাওয়াতকৃত পৃষ্ঠা' : 'নির্বাচিত দিনের তিলাওয়াতকৃত পৃষ্ঠা'}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                দৈনিক লক্ষ্য: {toBengaliDigits(todayPagesRead)}/{toBengaliDigits(dailyPageGoal)} পৃষ্ঠা ({toBengaliDigits(dailyQuranGoalPercent)}%)
              </span>
            </div>

            {/* Stepper Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleUpdateQuranPages(todayPagesRead - 1)}
                disabled={todayPagesRead <= 0}
                className="w-8 h-8 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-bold text-base flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-35 cursor-pointer transition-colors"
                title="১ পৃষ্ঠা কমান"
              >
                -
              </button>

              <input
                type="number"
                min={0}
                max={604}
                value={todayPagesRead}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  handleUpdateQuranPages(isNaN(val) ? 0 : val);
                }}
                aria-label="তিলাওয়াতকৃত পৃষ্ঠা সংখ্যা"
                className="w-16 text-center py-1 px-2 rounded-xl bg-white dark:bg-stone-800 border border-emerald-500/30 text-sm font-black font-mono text-[#177a56] dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-[#177a56]"
              />

              <button
                type="button"
                onClick={() => handleUpdateQuranPages(todayPagesRead + 1)}
                disabled={todayPagesRead >= 604}
                className="w-8 h-8 rounded-xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-base flex items-center justify-center disabled:opacity-35 cursor-pointer transition-colors shadow-2xs"
                title="১ পৃষ্ঠা যোগ করুন"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick-Add Page Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 block">
              দ্রুত পৃষ্ঠা যুক্ত করুন:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { add: 1, label: '+১ পৃষ্ঠা' },
                { add: 2, label: '+২ পৃষ্ঠা' },
                { add: 4, label: '+৪ পৃষ্ঠা' },
                { add: 10, label: '+১০ পৃষ্ঠা (আধা পারা)' },
                { add: 20, label: '+২০ পৃষ্ঠা (১ পারা)' }
              ].map((chip) => (
                <button
                  key={chip.add}
                  type="button"
                  onClick={() => handleUpdateQuranPages(todayPagesRead + chip.add)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-stone-200 dark:border-stone-700 hover:border-emerald-500/40 text-xs font-bold text-stone-700 dark:text-stone-200 hover:text-[#177a56] dark:hover:text-emerald-300 transition-all cursor-pointer active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
              {todayPagesRead > 0 && (
                <button
                  type="button"
                  onClick={() => handleUpdateQuranPages(0)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 text-xs font-bold transition-all cursor-pointer ml-auto"
                >
                  রিসেট
                </button>
              )}
            </div>
          </div>

          {/* Daily Page Target Selector */}
          <div className="pt-2 border-t border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
              দৈনিক তিলাওয়াত লক্ষ্য:
            </span>
            <div className="flex items-center gap-1">
              {[
                { goal: 2, label: '২ পৃষ্ঠা' },
                { goal: 4, label: '৪ পৃষ্ঠা' },
                { goal: 10, label: '১০ পৃষ্ঠা' },
                { goal: 20, label: '২০ পৃষ্ঠা (১ পারা)' }
              ].map((preset) => (
                <button
                  key={preset.goal}
                  type="button"
                  onClick={() => handleUpdateDailyPageGoal(preset.goal)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    dailyPageGoal === preset.goal
                      ? 'bg-[#177a56] text-white shadow-2xs'
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Daily Sunnah, Duas, Quiz & Nawafil Checklist */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-none">
                সুন্নাহ, মাসনূন দোয়া ও ইসলামিক কুইজ
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 font-medium">
                দিনের শেষে সম্পন্ন না হলে লাল রঙে ফ্ল্যাগড হিসেবে প্রদর্শিত হবে
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Daily Sunnah Practice */}
          {(() => {
            const isDone = !!activeRecord.sunnahDone;
            const isMissed = isFieldMissed('sunnahDone');

            let cardStyle = 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100';
            let badgeStyle = 'bg-stone-200 dark:bg-stone-800 text-stone-500';
            let badgeText = 'বাকি আছে';

            if (isDone) {
              cardStyle = 'bg-emerald-50/90 dark:bg-emerald-950/50 border-[#177a56]/50 dark:border-emerald-600/50 text-[#177a56] dark:text-emerald-200 font-bold';
              badgeStyle = 'bg-[#177a56] text-white';
              badgeText = 'সম্পন্ন (+৫)';
            } else if (isMissed) {
              cardStyle = 'bg-rose-50/95 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-800 dark:text-rose-200 font-bold ring-1 ring-rose-500/30';
              badgeStyle = 'bg-rose-600 text-white font-bold';
              badgeText = 'সুন্নাহ মিসড';
            }

            return (
              <button
                onClick={() => handleToggleField('sunnahDone', COIN_REWARDS.SUNNAH, 'সুন্নাহ আমল')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${cardStyle}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isMissed ? 'bg-rose-100 dark:bg-rose-900 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-950 text-[#177a56]'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block leading-tight">দৈনিক সুন্নাহ আমল</span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">মিসওয়াক, সুন্নত সালাত ও আদব</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${badgeStyle}`}>
                  {badgeText}
                </span>
              </button>
            );
          })()}

          {/* 2. Morning Azkar & Dua */}
          {(() => {
            const isDone = !!activeRecord.morningAzkarDone;
            const isMissed = isFieldMissed('morningAzkarDone');

            let cardStyle = 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100';
            let badgeStyle = 'bg-stone-200 dark:bg-stone-800 text-stone-500';
            let badgeText = 'বাকি আছে';

            if (isDone) {
              cardStyle = 'bg-emerald-50/90 dark:bg-emerald-950/50 border-[#177a56]/50 dark:border-emerald-600/50 text-[#177a56] dark:text-emerald-200 font-bold';
              badgeStyle = 'bg-[#177a56] text-white';
              badgeText = 'সম্পন্ন (+৩)';
            } else if (isMissed) {
              cardStyle = 'bg-rose-50/95 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-800 dark:text-rose-200 font-bold ring-1 ring-rose-500/30';
              badgeStyle = 'bg-rose-600 text-white font-bold';
              badgeText = 'দোয়া মিসড';
            }

            return (
              <button
                onClick={() => handleToggleField('morningAzkarDone', COIN_REWARDS.DUA, 'সকালের দোয়া')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${cardStyle}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isMissed ? 'bg-rose-100 dark:bg-rose-900 text-rose-600' : 'bg-amber-50 dark:bg-amber-950 text-amber-600'}`}>
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block leading-tight">সকালের আজকার ও দোয়া</span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">সুবহে সাদিক ও প্রভাতের জিকির</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${badgeStyle}`}>
                  {badgeText}
                </span>
              </button>
            );
          })()}

          {/* 3. Evening Azkar & Dua */}
          {(() => {
            const isDone = !!activeRecord.eveningAzkarDone;
            const isMissed = isFieldMissed('eveningAzkarDone');

            let cardStyle = 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100';
            let badgeStyle = 'bg-stone-200 dark:bg-stone-800 text-stone-500';
            let badgeText = 'বাকি আছে';

            if (isDone) {
              cardStyle = 'bg-emerald-50/90 dark:bg-emerald-950/50 border-[#177a56]/50 dark:border-emerald-600/50 text-[#177a56] dark:text-emerald-200 font-bold';
              badgeStyle = 'bg-[#177a56] text-white';
              badgeText = 'সম্পন্ন (+৩)';
            } else if (isMissed) {
              cardStyle = 'bg-rose-50/95 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-800 dark:text-rose-200 font-bold ring-1 ring-rose-500/30';
              badgeStyle = 'bg-rose-600 text-white font-bold';
              badgeText = 'দোয়া মিসড';
            }

            return (
              <button
                onClick={() => handleToggleField('eveningAzkarDone', COIN_REWARDS.DUA, 'সন্ধ্যার দোয়া')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${cardStyle}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isMissed ? 'bg-rose-100 dark:bg-rose-900 text-rose-600' : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-500'}`}>
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block leading-tight">সন্ধ্যার আজকার ও দোয়া</span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">আসর ও মাগরিব পরবর্তী আমল</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${badgeStyle}`}>
                  {badgeText}
                </span>
              </button>
            );
          })()}

          {/* 4. Daily Islamic Quiz */}
          {(() => {
            const isDone = !!activeRecord.quizDone;
            const isMissed = isFieldMissed('quizDone');

            let cardStyle = 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100';
            let badgeStyle = 'bg-stone-200 dark:bg-stone-800 text-stone-500';
            let badgeText = 'বাকি আছে';

            if (isDone) {
              cardStyle = 'bg-emerald-50/90 dark:bg-emerald-950/50 border-[#177a56]/50 dark:border-emerald-600/50 text-[#177a56] dark:text-emerald-200 font-bold';
              badgeStyle = 'bg-[#177a56] text-white';
              badgeText = 'সম্পন্ন (+৫)';
            } else if (isMissed) {
              cardStyle = 'bg-rose-50/95 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-800 dark:text-rose-200 font-bold ring-1 ring-rose-500/30';
              badgeStyle = 'bg-rose-600 text-white font-bold';
              badgeText = 'কুইজ মিসড';
            }

            return (
              <button
                onClick={() => handleToggleField('quizDone', COIN_REWARDS.QUIZ_CORRECT, 'ইসলামিক কুইজ')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${cardStyle}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isMissed ? 'bg-rose-100 dark:bg-rose-900 text-rose-600' : 'bg-purple-50 dark:bg-purple-950 text-purple-600'}`}>
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block leading-tight">প্রতিদিনের ইসলামিক কুইজ</span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">প্রতিদিনের ৫টি বিশুদ্ধ প্রশ্ন</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${badgeStyle}`}>
                  {badgeText}
                </span>
              </button>
            );
          })()}

          {/* 5. Fasting (Roza) */}
          {(() => {
            const isDone = !!activeRecord.fastingDone;

            return (
              <button
                onClick={() => handleToggleField('fastingDone', COIN_REWARDS.FASTING, 'সিয়াম পালন')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
                  isDone
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-[#177a56]/50 dark:border-emerald-600/50 text-[#177a56] dark:text-emerald-200 font-bold'
                    : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#177a56] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block leading-tight">সিয়াম / রোজা পালন</span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">ফরজ বা নফল রোজা</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isDone ? 'bg-[#177a56] text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-500'}`}>
                  {isDone ? 'পালিত (+২০)' : 'বাকি'}
                </span>
              </button>
            );
          })()}

          {/* 6. Charity (Sadaqah) */}
          {(() => {
            const isDone = !!activeRecord.sadaqahDone;

            return (
              <button
                onClick={() => handleToggleField('sadaqahDone', COIN_REWARDS.SADAQAH, 'দান ও সদকা')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
                  isDone
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-[#177a56]/50 dark:border-emerald-600/50 text-[#177a56] dark:text-emerald-200 font-bold'
                    : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-500 flex items-center justify-center">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block leading-tight">দান ও সদকা</span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">আল্লাহর সন্তুষ্টির উদ্দেশ্যে দান</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isDone ? 'bg-[#177a56] text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-500'}`}>
                  {isDone ? 'সম্পন্ন (+১০)' : 'বাকি'}
                </span>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
});
