import React, { useMemo, useState, useEffect } from 'react';
import { 
  Compass, 
  BookOpen, 
  CircleDot, 
  Sparkles, 
  CheckCircle2, 
  Moon, 
  Clock, 
  Share2, 
  ArrowRight,
  Flame,
  Star,
  Trophy,
  Calendar,
  HeartHandshake,
  Check,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  FileText,
  Target,
  Sliders,
  X,
  AlertCircle,
  Calculator
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PrayerTimes, NextPrayerInfo, District, DailyAmalRecord } from '../types';
import { toBengaliDigits, getPrayerWaqtStatus, prayerTimeToDate } from '../utils/prayerTimes';
import { AUTHENTIC_HADITHS } from '../data/hadiths';
import { AUTHENTIC_DUAS } from '../data/duas';
import { triggerHaptic } from '../utils/audio';
import { getDailyHadith, getDailyDua } from '../utils/dailyHadith';
import { useSync } from '../context/SyncContext';
import { checkPreviousDayMissedPrayers, PrayerKey, PRAYER_NAMES_BN, hasLaterPrayerBeenMarked } from '../utils/amalCheck';

interface HomeDashboardProps {
  district: District;
  prayers: PrayerTimes;
  nextPrayer: NextPrayerInfo;
  currentPrayer: { nameBn: string; nameKey: string; timeStr: string };
  currentTime: Date;
  amalRecord: DailyAmalRecord;
  streakDays?: number;
  totalPoints?: number;
  userName?: string;
  dailyPrayerGoal?: number;
  onUpdateDailyGoal?: (goal: number) => void;
  onToggleAmalPrayer: (prayerKey: keyof DailyAmalRecord['prayers']) => void;
  onToggleAmalField?: (field: 'morningAzkarDone' | 'eveningAzkarDone' | 'fastingDone' | 'sadaqahDone' | 'sunnahDone' | 'duaDone' | 'quizDone') => void;
  onNavigateTab: (tab: 'home' | 'prayers' | 'amal' | 'quran' | 'duas' | 'more') => void;
  onOpenMoreSection: (section: 'tasbih' | 'qibla' | 'ramadan' | 'quiz' | 'hadith' | 'sunnah' | 'azkar' | 'tracker' | 'prayer_guide' | 'hajj_guide' | 'hajj_countdown' | 'zakat' | 'ranking' | 'notes' | 'settings') => void;
  onOpenDeenNavigator: () => void;
  onOpenCalendarReminders?: () => void;
  onOpenShareModal: (content: { title: string; arabic?: string; translation: string; reference: string }) => void;
  missedPrayers?: Array<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'>;
  hijriDayAdjustment?: number;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = React.memo(({
  district,
  prayers,
  nextPrayer,
  currentPrayer,
  currentTime,
  amalRecord,
  streakDays = 1,
  totalPoints = 120,
  userName = 'মুসাফির',
  dailyPrayerGoal = 5,
  onUpdateDailyGoal,
  onToggleAmalPrayer,
  onToggleAmalField,
  onNavigateTab,
  onOpenMoreSection,
  onOpenDeenNavigator,
  onOpenCalendarReminders,
  onOpenShareModal,
  missedPrayers = [],
  hijriDayAdjustment = 0
}) => {
  const { amalRecords, saveAmalRecord, publishedCmsContents } = useSync();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<number>(dailyPrayerGoal || 5);

  useEffect(() => {
    setSelectedGoal(dailyPrayerGoal || 5);
  }, [dailyPrayerGoal]);

  // Format current live time in Bengali
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const ampm = hours >= 12 ? 'অপরাহ্ন' : 'পূর্বাহ্ন';
  const hours12 = hours % 12 || 12;
  const timeFormattedBn = `${toBengaliDigits(hours12)}:${toBengaliDigits(minutes < 10 ? '0' + minutes : minutes)}:${toBengaliDigits(seconds < 10 ? '0' + seconds : seconds)} ${ampm}`;

  // Next prayer countdown formatting
  const cdHours = Math.floor(nextPrayer.remainingMinutes / 60);
  const cdMins = nextPrayer.remainingMinutes % 60;
  const cdSecs = nextPrayer.remainingSeconds % 60;
  
  let countdownDisplay = '';
  if (cdHours > 0) {
    countdownDisplay = `${toBengaliDigits(cdHours)} ঘণ্টা ${toBengaliDigits(cdMins)} মি. ${toBengaliDigits(cdSecs)} সে. বাকি`;
  } else {
    countdownDisplay = `${toBengaliDigits(cdMins)} মিনিট ${toBengaliDigits(cdSecs)} সেকেন্ড বাকি`;
  }

  // Today's featured Hadith & Dua (deterministic daily rotation at 12:00 AM Bangladesh Time / Asia-Dhaka)
  const todayHadith = useMemo(() => {
    return getDailyHadith(currentTime);
  }, [prayers.dateStr]);
  const dailyDuaInfo = useMemo(() => {
    return getDailyDua(currentTime);
  }, [prayers.dateStr]);
  const todayDua = dailyDuaInfo.dua;

  const prayerTimeline = useMemo(() => [
    { key: 'fajr' as const, name: 'ফজর', time: prayers.fajr },
    { key: 'sunrise' as const, name: 'সূর্যোদয়', time: prayers.sunrise, isSun: true },
    { key: 'dhuhr' as const, name: 'যোহর', time: prayers.dhuhr },
    { key: 'asr' as const, name: 'আসর', time: prayers.asr },
    { key: 'maghrib' as const, name: 'মাগরিব', time: prayers.maghrib },
    { key: 'isha' as const, name: 'এশা', time: prayers.isha }
  ], [prayers]);

  // Calculate today's completed deeds & daily prayer goal progress
  const completedPrayersCount = Object.values(amalRecord.prayers || {}).filter(Boolean).length;
  const allDailyPrayersCompleted = completedPrayersCount >= 5;
  const activeDailyGoal = Math.max(1, dailyPrayerGoal || 5);
  const progressRatio = Math.min(1, completedPrayersCount / activeDailyGoal);
  const goalPercent = Math.min(100, Math.round((completedPrayersCount / activeDailyGoal) * 100));
  const remainingToGoal = Math.max(0, activeDailyGoal - completedPrayersCount);
  const isGoalReached = completedPrayersCount >= activeDailyGoal;

  const ringRadius = 32;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeDashoffset = ringCircumference - (ringCircumference * progressRatio);

  let otherAmalsCount = 0;
  if (amalRecord.morningAzkarDone) otherAmalsCount++;
  if (amalRecord.eveningAzkarDone) otherAmalsCount++;
  if (amalRecord.fastingDone) otherAmalsCount++;
  if (amalRecord.sadaqahDone) otherAmalsCount++;

  const totalCompletedToday = completedPrayersCount + otherAmalsCount;
  const totalPossibleToday = 9; // 5 prayers + 4 general deeds
  const progressPercentage = Math.round((totalCompletedToday / totalPossibleToday) * 100);

  const handlePrayerTap = (key: keyof DailyAmalRecord['prayers']) => {
    const wasDone = !!amalRecord.prayers[key];
    const isLocked = !wasDone && hasLaterPrayerBeenMarked(key as PrayerKey, amalRecord.prayers);

    if (isLocked) {
      triggerHaptic([70, 50, 70]);
      onToggleAmalPrayer(key);
      return;
    }

    if (wasDone && hasLaterPrayerBeenMarked(key as PrayerKey, amalRecord.prayers)) {
      triggerHaptic([70, 50, 70]);
      onToggleAmalPrayer(key);
      return;
    }

    triggerHaptic(25);
    onToggleAmalPrayer(key);
    if (!wasDone) {
      const willReachGoal = (completedPrayersCount + 1) >= activeDailyGoal;
      try {
        confetti({
          particleCount: willReachGoal ? 55 : 30,
          spread: willReachGoal ? 65 : 45,
          origin: { y: 0.75 },
          colors: ['#177a56', '#10b981', '#f59e0b', '#34d399']
        });
      } catch (e) {}
    }
  };

  const handleAmalToggle = (field: 'morningAzkarDone' | 'eveningAzkarDone' | 'fastingDone' | 'sadaqahDone') => {
    triggerHaptic(20);
    if (onToggleAmalField) {
      onToggleAmalField(field);
    }
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Greeting & Date Banner (Qalbee style) */}
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-[#177a56] dark:text-emerald-400 font-bold text-xs">
            {userName ? userName.charAt(0) : 'ও'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-stone-900 dark:text-stone-100">
                আসসালামু আলাইকুম
              </span>
              <span className="text-stone-400">·</span>
              <span className="text-[#177a56] dark:text-emerald-400 font-semibold">{userName}</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
              {district.nameBn} · {prayers.dateStr}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-bold text-[#177a56] dark:text-emerald-400">
            {prayers.hijriDateStr}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-stone-500 dark:text-stone-400 font-semibold">
            {timeFormattedBn}
          </div>
        </div>
      </div>

      {/* 2. Streak & Points Summary Bar (Qalbee signature) */}
      <section className={`bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-amber-500/10 dark:from-amber-950/40 dark:via-emerald-950/30 dark:to-amber-950/40 rounded-2xl p-3.5 border flex items-center justify-between shadow-xs transition-all duration-300 ${
        allDailyPrayersCompleted 
          ? 'border-amber-500/50 shadow-amber-500/10' 
          : 'border-amber-500/25'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-xs transition-transform ${
            allDailyPrayersCompleted ? 'animate-pulse-soft ring-2 ring-amber-400/50 shadow-md shadow-amber-500/20' : ''
          }`}>
            <Flame className={`w-5 h-5 fill-white ${allDailyPrayersCompleted ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                আমল স্ট্রিক:
              </span>
              <span className={`text-xs font-bold font-mono tabular-nums px-2 py-0.5 rounded-lg transition-all ${
                allDailyPrayersCompleted
                  ? 'animate-pulse-soft bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/40 shadow-2xs font-extrabold'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {toBengaliDigits(streakDays)} দিন {allDailyPrayersCompleted && '🔥'}
              </span>
              {allDailyPrayersCompleted && (
                <span className="animate-pulse-soft inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                  ৫ ওয়াক্ত পূর্ণ!
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
              আজকের আমল: <strong className="text-[#177a56] dark:text-emerald-400">{toBengaliDigits(totalCompletedToday)}/{toBengaliDigits(totalPossibleToday)}</strong> সম্পন্ন ({toBengaliDigits(progressPercentage)}%)
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenMoreSection('ranking')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-xs hover:bg-amber-600 transition-colors cursor-pointer"
        >
          <Star className="w-3.5 h-3.5 fill-white" />
          <span>{toBengaliDigits(totalPoints)}</span>
        </button>
      </section>

      {/* 3. Primary Focal Anchor: Next Salat Hero Card (Qalbee Emerald) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0d4430] text-white p-5 shadow-lg border border-emerald-500/20">
        {/* Subtle geometric Islamic motif background */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 border border-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-56 h-56 border border-white/10 rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs text-emerald-100 font-medium border border-white/10">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>চলমান ওয়াক্ত: <strong className="text-white font-bold">{currentPrayer.nameBn}</strong></span>
            </div>
            <span className="text-xs font-mono text-emerald-200 tabular-nums font-semibold bg-emerald-950/40 px-2 py-0.5 rounded-full">
              {district.nameBn}
            </span>
          </div>

          <div className="mt-4 mb-3 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-emerald-200 font-medium">পরবর্তী সালাত</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 leading-snug">
                {nextPrayer.nameBn}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-amber-300 tabular-nums font-mono drop-shadow-xs">
                {nextPrayer.timeStr}
              </span>
            </div>
          </div>

          {/* Progress bar and countdown */}
          <div className="space-y-2">
            <div className="h-2 w-full bg-emerald-950/70 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-emerald-300 via-amber-300 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, nextPrayer.percentageRemaining))}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-emerald-100 font-medium">
              <span className="font-semibold text-amber-200">{countdownDisplay}</span>
              <button
                onClick={() => onNavigateTab('prayers')}
                className="hover:text-white transition-colors underline flex items-center gap-0.5 cursor-pointer font-bold"
              >
                পূর্ণ ওয়াক্তসূচি
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Today's 6 Prayer Times Ribbon */}
      <section className="bg-white dark:bg-[#131b17] rounded-2xl p-3 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15">
        <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 mb-2 px-1 font-semibold">
          <span>আজকের সালাতের সময়সূচি</span>
          <span className="text-[11px] text-[#177a56] dark:text-emerald-400 font-bold">{prayers.dateStr}</span>
        </div>

        <div className="grid grid-cols-6 gap-1 text-center">
          {prayerTimeline.map((p) => {
            const isCurrent = currentPrayer.nameKey === p.key;
            const isNext = nextPrayer.nameKey === p.key;
            const isPrayerKey = p.key === 'fajr' || p.key === 'dhuhr' || p.key === 'asr' || p.key === 'maghrib' || p.key === 'isha';
            const isDone = isPrayerKey ? !!amalRecord.prayers[p.key] : false;
            const isLocked = isPrayerKey && !isDone && hasLaterPrayerBeenMarked(p.key as PrayerKey, amalRecord.prayers);
            const isMissed = isPrayerKey && (isLocked || missedPrayers.includes(p.key));

            let boxStyle = 'bg-stone-50 dark:bg-stone-900/60 text-stone-800 dark:text-stone-200 font-medium';
            let nameStyle = 'font-semibold text-stone-700 dark:text-stone-300';
            let timeStyle = 'text-stone-900 dark:text-stone-100';
            let subStyle = 'text-stone-500 dark:text-stone-400';
            let subText = p.time.split(' ')[1] || '';

            if (isCurrent) {
              boxStyle = 'bg-[#177a56] text-white font-bold shadow-xs scale-102';
              nameStyle = 'text-white font-bold';
              timeStyle = 'text-white';
              subStyle = 'text-amber-200 font-semibold';
              subText = 'চলতি';
            } else if (isDone) {
              boxStyle = 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/40 text-[#177a56] dark:text-emerald-300 font-bold';
              nameStyle = 'text-[#177a56] dark:text-emerald-300 font-bold';
              timeStyle = 'text-[#177a56] dark:text-emerald-200';
              subStyle = 'text-emerald-600 dark:text-emerald-400 font-bold';
              subText = 'আদায়';
            } else if (isNext) {
              boxStyle = 'bg-amber-100 dark:bg-amber-950/60 border border-amber-400/50 text-amber-950 dark:text-amber-200 font-bold';
              nameStyle = 'text-amber-900 dark:text-amber-200 font-bold';
              timeStyle = 'text-amber-950 dark:text-amber-100';
              subStyle = 'text-amber-700 dark:text-amber-300 font-semibold';
              subText = 'পরবর্তী';
            } else if (isMissed) {
              boxStyle = 'bg-red-100 dark:bg-red-950/80 border-2 border-red-500 text-red-900 dark:text-red-100 font-bold shadow-xs';
              nameStyle = 'text-red-700 dark:text-red-300 font-bold';
              timeStyle = 'text-red-900 dark:text-red-100 font-bold';
              subStyle = 'text-red-600 dark:text-red-300 font-extrabold';
              subText = 'মিসড';
            }

            return (
              <div
                key={p.key}
                className={`py-2 px-0.5 rounded-xl transition-all ${boxStyle}`}
              >
                <span className={`block text-[11px] truncate leading-tight ${nameStyle}`}>{p.name}</span>
                <span className={`block text-xs font-mono mt-0.5 tabular-nums font-bold ${timeStyle}`}>
                  {p.time.split(' ')[0]}
                </span>
                <span className={`block text-[9px] font-mono tabular-nums leading-tight ${subStyle}`}>
                  {subText}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Daily Prayer Goal & Consistency Widget with Circular Progress Ring */}
      <section className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-4">
        {/* Header with Goal Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-[#177a56] dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-none">
                দৈনিক সালাত লক্ষ্য ও অগ্রগতি
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                ধারাবাহিকতা বজায় রাখতে প্রতিদিনের লক্ষ্য নির্ধারণ করুন
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic(15);
              setIsGoalModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[#177a56] dark:text-emerald-300 text-xs font-bold border border-emerald-500/20 transition-all cursor-pointer shadow-2xs"
            title="দৈনিক সালাত লক্ষ্য পরিবর্তন করুন"
          >
            <Target className="w-3.5 h-3.5" />
            <span>লক্ষ্য: {toBengaliDigits(activeDailyGoal)} ওয়াক্ত</span>
            <Sliders className="w-3 h-3 text-stone-400" />
          </button>
        </div>

        {/* Progress Ring Hero Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/8 via-emerald-500/4 to-amber-500/8 dark:from-emerald-950/30 dark:to-amber-950/20 border border-emerald-500/15 flex items-center gap-4">
          {/* Circular Progress Ring */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={ringRadius}
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-stone-200/80 dark:text-stone-800"
              />
              <circle
                cx="40"
                cy="40"
                r={ringRadius}
                stroke="url(#goalProgressGradient)"
                strokeWidth="6"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringStrokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="goalProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-base font-extrabold text-stone-900 dark:text-stone-50 font-mono leading-none">
                {toBengaliDigits(completedPrayersCount)}/{toBengaliDigits(activeDailyGoal)}
              </span>
              <span className="text-[9px] font-bold text-[#177a56] dark:text-emerald-400 mt-0.5 font-mono">
                {toBengaliDigits(goalPercent)}%
              </span>
            </div>
          </div>

          {/* Progress Details & Motivation */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isGoalReached ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700/60">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                  মাশাআল্লাহ! আজকের লক্ষ্য পূর্ণ
                </span>
              ) : (
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  আর মাত্র {toBengaliDigits(remainingToGoal)} ওয়াক্ত বাকি
                </span>
              )}
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
              {isGoalReached 
                ? 'আলহামদুলিল্লাহ! আপনার আজকের সালাত ধারাবাহিকতার লক্ষ্য সফলভাবে অর্জিত হয়েছে।'
                : `আজকের লক্ষ্য সফল করতে আরও ${toBengaliDigits(remainingToGoal)} ওয়াক্ত সালাত আদায় করুন।`}
            </p>

            <div className="flex items-center gap-2 pt-1 text-[10px] text-stone-500 dark:text-stone-400">
              <span>সালাত পয়েন্ট: <strong className="text-[#177a56] dark:text-emerald-400 font-mono font-bold">+{toBengaliDigits(completedPrayersCount * 15)}</strong></span>
              <span>•</span>
              <button 
                onClick={() => onNavigateTab('amal')}
                className="text-[#177a56] dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                আমল ট্র্যাকার
              </button>
            </div>
          </div>
        </div>

        {/* Missed Prayer Visual Banner (Only if current date matches record date and time passed) */}
        {missedPrayers.length > 0 && (
          <div className="bg-red-100 dark:bg-red-950/70 border-2 border-red-500 rounded-2xl p-3.5 sm:p-4 text-red-900 dark:text-red-100 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-red-900 dark:text-red-100 leading-tight">
                    আজকের মিসড সালাত ({toBengaliDigits(missedPrayers.length)} ওয়াক্ত সময় অতিক্রান্ত)
                  </h4>
                  <p className="text-[10px] text-red-700 dark:text-red-300 font-medium">
                    পরবর্তী ওয়াক্তের সালাত আদায় অথবা সময় পেরিয়ে যাওয়ায় মিসড হিসেবে সংরক্ষিত
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('amal')}
                className="text-[11px] font-bold text-red-700 dark:text-red-300 hover:text-red-900 underline flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <span>ট্র্যাকার</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {missedPrayers.map((pKey) => {
                const isLocked = hasLaterPrayerBeenMarked(pKey, amalRecord.prayers);
                return (
                  <button
                    key={pKey}
                    onClick={() => handlePrayerTap(pKey)}
                    className="bg-red-200/80 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-900 dark:text-red-100 hover:bg-red-300/80 dark:hover:bg-red-900/80 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title={isLocked ? 'পরবর্তী ওয়াক্ত আদায় করায় এই ওয়াক্তটি আর চিহ্নিত করা যাবে না' : 'মিসড ওয়াক্ত'}
                  >
                    <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400 stroke-[3]" />
                    <span>{PRAYER_NAMES_BN[pKey]} মিসড {isLocked ? '(লক)' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5-Prayer Toggle Buttons */}
        <div className="grid grid-cols-5 gap-2">
          {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((key) => {
            const labelsBn: Record<string, string> = {
              fajr: 'ফজর',
              dhuhr: 'যোহর',
              asr: 'আসর',
              maghrib: 'মাগরিব',
              isha: 'এশা'
            };
            const isDone = !!amalRecord.prayers[key];
            const isLocked = !isDone && hasLaterPrayerBeenMarked(key, amalRecord.prayers);
            const isMissed = isLocked || missedPrayers.includes(key);
            const isCurrent = currentPrayer.nameKey === key;
            const isNext = nextPrayer.nameKey === key;

            let btnStyle = 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-medium';
            let iconBox = 'bg-stone-200 dark:bg-stone-800 text-stone-400';
            let badgeText = 'বাকি';
            let badgeStyle = 'text-stone-400';

            if (isDone) {
              btnStyle = 'bg-[#177a56] border-[#177a56] text-white font-bold shadow-xs scale-102';
              iconBox = 'bg-white/20 text-white';
              badgeText = 'আদায় (+১৫)';
              badgeStyle = 'text-emerald-100 font-semibold';
            } else if (isLocked) {
              btnStyle = 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 cursor-not-allowed opacity-90';
              iconBox = 'bg-rose-500 text-white';
              badgeText = 'মিসড (লক)';
              badgeStyle = 'text-rose-600 dark:text-rose-400 font-extrabold';
            } else if (isCurrent) {
              btnStyle = 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 text-[#177a56] dark:text-emerald-300 font-bold ring-2 ring-emerald-500/30';
              iconBox = 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200';
              badgeText = 'চলতি ওয়াক্ত';
              badgeStyle = 'text-emerald-700 dark:text-emerald-300 font-bold';
            } else if (isNext) {
              btnStyle = 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200 font-bold';
              iconBox = 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200';
              badgeText = 'পরবর্তী';
              badgeStyle = 'text-amber-700 dark:text-amber-300 font-bold';
            } else if (isMissed) {
              btnStyle = 'bg-red-100 dark:bg-red-950/80 border-2 border-red-500 text-red-900 dark:text-red-100 font-bold shadow-xs ring-1 ring-red-500/30';
              iconBox = 'bg-red-500 text-white';
              badgeText = 'মিসড';
              badgeStyle = 'text-red-700 dark:text-red-300 font-extrabold';
            } else {
              badgeText = 'বাকি';
            }

            return (
              <button
                key={key}
                onClick={() => handlePrayerTap(key)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all select-none border ${btnStyle} ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                title={isLocked ? 'পরবর্তী ওয়াক্ত আদায় করায় পূর্বের ওয়াক্ত আর চিহ্নিত করা যাবে না' : isDone ? 'আদায় সম্পন্ন' : 'আদায় চিহ্নিত করতে ট্যাপ করুন'}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 transition-all ${iconBox}`}>
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isLocked || isMissed ? (
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span className="text-[10px]">•</span>
                  )}
                </div>
                <span className="text-xs font-bold leading-tight">{labelsBn[key]}</span>
                <span className={`text-[9px] mt-0.5 whitespace-nowrap ${badgeStyle}`}>
                  {badgeText}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Deen Navigator Interactive Shortcut Banner */}
      <section 
        onClick={onOpenDeenNavigator}
        className="cursor-pointer group p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 dark:from-amber-950/40 dark:to-emerald-950/40 border border-amber-400/40 dark:border-amber-600/30 flex items-center justify-between transition-transform active:scale-[0.99] shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-1.5 leading-snug">
              এখন আমার কী করা উচিত?
              <span className="text-[10px] text-amber-800 dark:text-amber-200 font-bold bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded-md">
                সুন্নাহ গাইড
              </span>
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 font-normal leading-normal mt-0.5">
              বর্তমান ওয়াক্ত ও পরিস্থিতির সর্বোত্তম নফল আমল ও দোয়া জানুন
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
      </section>

      {/* 7. Explore & Feature Hub Grid (Qalbee signature hub) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            দ্বীনি সেবা ও ফিচারসমূহ
          </h3>
          <button
            onClick={() => onNavigateTab('more')}
            className="text-xs font-bold text-[#177a56] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            সব দেখুন
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {/* Item 1: Quran */}
          <button
            onClick={() => onNavigateTab('quran')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">কুরআন</span>
          </button>

          {/* Item 2: Tasbih */}
          <button
            onClick={() => onOpenMoreSection('tasbih')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <CircleDot className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">তাসবিহ</span>
          </button>

          {/* Item 3: Duas */}
          <button
            onClick={() => onNavigateTab('duas')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">দোয়া</span>
          </button>

          {/* Item 4: Hadith */}
          <button
            onClick={() => onOpenMoreSection('hadith')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">হাদিস</span>
          </button>

          {/* Item 5: Sunnah */}
          <button
            onClick={() => onOpenMoreSection('sunnah')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">সুন্নাহ</span>
          </button>

          {/* Item 6: Ramadan */}
          <button
            onClick={() => onOpenMoreSection('ramadan')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Moon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">রমজান</span>
          </button>

          {/* Item 7: Quiz */}
          <button
            onClick={() => onOpenMoreSection('quiz')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">কুইজ</span>
          </button>

          {/* Item 8: Leaderboard / Ranking */}
          <button
            onClick={() => onOpenMoreSection('ranking')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">র‍্যাংকিং</span>
          </button>
        </div>

        {/* Quick Zakat Calculator Banner */}
        <button
          onClick={() => onOpenMoreSection('zakat')}
          className="w-full p-3 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Calculator className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 block leading-tight">
                যাকাত ক্যালকুলেটর
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                স্বর্ণ-রুপা, নগদ অর্থ ও ব্যবসায়িক সম্পদের ২.৫% যাকাত হিসাব করুন
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#177a56] group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </section>

      {/* 8. Daily Amal Quick Checkpoints */}
      <section className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              দৈনিক সুন্নাহ ও মাসনুন আমল
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('amal')}
            className="text-xs font-bold text-[#177a56] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            সব দেখুন
          </button>
        </div>

        {(() => {
          const dhuhrTime = prayerTimeToDate(prayers.dhuhr, currentTime);
          const ishaTime = prayerTimeToDate(prayers.isha, currentTime);
          const maghribTime = prayerTimeToDate(prayers.maghrib, currentTime);
          const nowMs = currentTime.getTime();

          const isMorningAzkarMissed = !amalRecord.morningAzkarDone && nowMs > dhuhrTime.getTime();
          const isEveningAzkarMissed = !amalRecord.eveningAzkarDone && nowMs > (ishaTime.getTime() + 3.5 * 3600000);
          const isSunnahDone = !!(amalRecord.sunnahDone || (amalRecord.completedSunnahKeys && amalRecord.completedSunnahKeys.length > 0));
          const isSunnahMissed = !isSunnahDone && nowMs > maghribTime.getTime();
          const isDuaDone = !!(amalRecord.duaDone || (amalRecord.completedDuaKeys && amalRecord.completedDuaKeys.length > 0));
          const isDuaMissed = !isDuaDone && nowMs > maghribTime.getTime();
          const isQuizDone = !!amalRecord.quizDone;
          const isQuizMissed = !isQuizDone && nowMs > maghribTime.getTime();

          const renderAmalCard = (
            title: string,
            isDone: boolean,
            isMissed: boolean,
            coinReward: number,
            onClick: () => void
          ) => {
            let containerStyle = 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300';
            let iconBox = 'border border-stone-300 dark:border-stone-700 text-transparent';
            let badgeText = `+${toBengaliDigits(coinReward)} কয়েন`;
            let badgeClass = 'bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400';

            if (isDone) {
              containerStyle = 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-[#177a56] dark:text-emerald-300 font-bold';
              iconBox = 'bg-[#177a56] text-white';
              badgeText = 'সম্পন্ন (+কয়েন)';
              badgeClass = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200';
            } else if (isMissed) {
              containerStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold';
              iconBox = 'bg-rose-600 text-white';
              badgeText = 'ছুটে গেছে';
              badgeClass = 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300';
            }

            return (
              <button
                onClick={onClick}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-left cursor-pointer transition-all ${containerStyle}`}
              >
                <div>
                  <span className="text-xs font-semibold block">{title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold mt-0.5 inline-block ${badgeClass}`}>
                    {badgeText}
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ml-1 ${iconBox}`}>
                  {isDone ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : isMissed ? (
                    <X className="w-3.5 h-3.5" />
                  ) : null}
                </div>
              </button>
            );
          };

          return (
            <div className="grid grid-cols-2 gap-2">
              {renderAmalCard(
                'সকালের আজকার',
                amalRecord.morningAzkarDone,
                isMorningAzkarMissed,
                10,
                () => handleAmalToggle('morningAzkarDone')
              )}

              {renderAmalCard(
                'সন্ধ্যার আজকার',
                amalRecord.eveningAzkarDone,
                isEveningAzkarMissed,
                10,
                () => handleAmalToggle('eveningAzkarDone')
              )}

              {renderAmalCard(
                'দৈনিক সুন্নাহ আমল',
                isSunnahDone,
                isSunnahMissed,
                10,
                () => {
                  if (onToggleAmalField) onToggleAmalField('sunnahDone');
                  else onOpenMoreSection('sunnah');
                }
              )}

              {renderAmalCard(
                'মাসনুন দোয়া পাঠ',
                isDuaDone,
                isDuaMissed,
                5,
                () => {
                  if (onToggleAmalField) onToggleAmalField('duaDone');
                  else onNavigateTab('duas');
                }
              )}

              {renderAmalCard(
                'দৈনিক কুইজ',
                isQuizDone,
                isQuizMissed,
                10,
                () => onOpenMoreSection('quiz')
              )}

              {renderAmalCard(
                'সাদাকাহ / দান',
                amalRecord.sadaqahDone,
                false,
                10,
                () => handleAmalToggle('sadaqahDone')
              )}
            </div>
          );
        })()}
      </section>

      {/* 9. Hadith of the Day Spotlight with Share Card */}
      <section className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 relative space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#177a56] dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-[#177a56] dark:bg-emerald-400" />
            <span>আজকের সহিহ হাদিস</span>
          </div>
          <button
            onClick={() => onOpenShareModal({
              title: todayHadith.titleBn,
              arabic: todayHadith.arabic,
              translation: todayHadith.translationBn,
              reference: `${todayHadith.sourceBook}, হাদিস নং ${toBengaliDigits(todayHadith.hadithNo)} (${todayHadith.grade})`
            })}
            className="p-1.5 text-stone-500 hover:text-[#177a56] dark:hover:text-emerald-400 transition-colors cursor-pointer rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title="শেয়ার কার্ড তৈরি করুন"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {todayHadith.arabic && (
          <p className="font-arabic text-right text-xl sm:text-2xl text-stone-900 dark:text-stone-50 my-2.5 leading-loose font-normal">
            {todayHadith.arabic}
          </p>
        )}
        <p className="text-sm text-stone-900 dark:text-stone-100 leading-relaxed font-medium">
          “{todayHadith.translationBn}”
        </p>

        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 font-medium">
          <span>{todayHadith.sourceBook} (হাদিস: {toBengaliDigits(todayHadith.hadithNo)})</span>
          <span className="text-[#177a56] dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">{todayHadith.grade}</span>
        </div>
      </section>

      {/* 10. Daily Dua Spotlight */}
      <section className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100 block leading-snug">
              {dailyDuaInfo.isFridayDurood ? 'জুমার বিশেষ দরুদ' : 'দৈনিক দোয়া'}: {todayDua.titleBn}
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
              {dailyDuaInfo.isFridayDurood
                ? 'শুক্রবার জুমার দিনের বিশেষ আমল · প্রতিদিন নতুন দোয়া'
                : `প্রতিদিন ধারাবাহিক পরিবর্তন (${toBengaliDigits(dailyDuaInfo.sequenceIndex)}/${toBengaliDigits(dailyDuaInfo.totalDuas)}) · জুমার দিনে বিশেষ দরুদ`}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('duas')}
            className="text-xs font-bold text-[#177a56] dark:text-emerald-400 hover:underline transition-colors cursor-pointer shrink-0"
          >
            আরও দোয়া
          </button>
        </div>

        <p className="font-arabic text-right text-xl text-stone-900 dark:text-stone-50 my-2 leading-loose font-normal">
          {todayDua.arabic}
        </p>
        {todayDua.transliteration && (
          <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-0.5">
            <span className="text-[11px] font-bold text-[#177a56] dark:text-emerald-400 block">উচ্চারণ:</span>
            <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
              {todayDua.transliteration}
            </p>
          </div>
        )}
        <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-normal">
          {todayDua.translation}
        </p>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium pt-1.5 border-t border-stone-100 dark:border-stone-800">
          উৎস: {todayDua.reference}
        </p>
      </section>

      {/* 10.5. Live Admin-Published Special Islamic Updates & Amals */}
      {publishedCmsContents && publishedCmsContents.length > 0 && (
        <section className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-500/25 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#177a56] dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>বিশেষ দ্বীনি বার্তা ও আমল (লাইভ আপডেট)</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-[#177a56] dark:text-emerald-300 px-2 py-0.5 rounded-md">
              নতুন সংযোজন
            </span>
          </div>

          <div className="space-y-2.5">
            {publishedCmsContents.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                    {item.titleBn}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    {item.categoryBn || 'দ্বীনি আমল'}
                  </span>
                </div>
                {item.arabic && (
                  <p className="font-arabic text-right text-lg text-stone-900 dark:text-stone-50 leading-loose">
                    {item.arabic}
                  </p>
                )}
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                  {item.translationBn}
                </p>
                {item.reference && (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    সূত্র: {item.reference}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Daily Goal Settings Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151B22] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    দৈনিক সালাতের লক্ষ্য নির্ধারণ
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    ধারাবাহিকতার জন্য প্রতিদিনের লক্ষ্য সেট করুন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Display */}
            <div className="flex items-center justify-center gap-4 py-3 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-100 dark:border-stone-800">
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedGoal((prev) => Math.max(1, prev - 1));
                }}
                disabled={selectedGoal <= 1}
                className="w-9 h-9 rounded-xl bg-white dark:bg-stone-700 shadow-xs flex items-center justify-center text-lg font-bold text-stone-700 dark:text-stone-200 disabled:opacity-30 cursor-pointer"
              >
                -
              </button>
              <div className="text-center min-w-[100px]">
                <span className="text-2xl font-black text-[#177a56] dark:text-emerald-400 font-mono">
                  {toBengaliDigits(selectedGoal)}
                </span>
                <span className="text-xs font-bold text-stone-600 dark:text-stone-400 block">
                  ওয়াক্ত সালাত
                </span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedGoal((prev) => Math.min(7, prev + 1));
                }}
                disabled={selectedGoal >= 7}
                className="w-9 h-9 rounded-xl bg-white dark:bg-stone-700 shadow-xs flex items-center justify-center text-lg font-bold text-stone-700 dark:text-stone-200 disabled:opacity-30 cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Preset Goal Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 block">
                জনপ্রিয় লক্ষ্যসমূহ:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { count: 3, label: '৩ ওয়াক্ত', desc: 'শুরুর স্তর' },
                  { count: 4, label: '৪ ওয়াক্ত', desc: 'উন্নত স্তর' },
                  { count: 5, label: '৫ ওয়াক্ত', desc: 'ফরয পূর্ণতা (প্রস্তাবিত)' },
                  { count: 7, label: '৭ ওয়াক্ত', desc: 'তাহাজ্জুদ ও চাশতসহ' }
                ].map((preset) => (
                  <button
                    key={preset.count}
                    onClick={() => {
                      triggerHaptic(20);
                      setSelectedGoal(preset.count);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedGoal === preset.count
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-[#177a56] dark:text-emerald-300 font-bold shadow-xs'
                        : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{preset.label}</span>
                      {selectedGoal === preset.count && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-normal mt-0.5">
                      {preset.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save & Cancel */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={() => {
                  triggerHaptic(25);
                  if (onUpdateDailyGoal) {
                    onUpdateDailyGoal(selectedGoal);
                  }
                  setIsGoalModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
