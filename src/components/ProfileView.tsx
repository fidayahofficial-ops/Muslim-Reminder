import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  User as UserIcon, 
  Award, 
  Flame, 
  CheckCircle2, 
  FileText, 
  Bookmark, 
  Edit3, 
  Download, 
  Upload, 
  ShieldCheck, 
  Moon, 
  Calendar,
  Check,
  X,
  Trophy,
  ArrowRight,
  Cloud,
  RefreshCw,
  LogIn,
  LogOut,
  Activity,
  TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { motion } from 'framer-motion';
import { UserSettings, MoreSection, UserProfile } from '../types';
import { storage } from '../utils/storage';
import { triggerHaptic } from '../utils/audio';
import { toBengaliDigits } from '../utils/prayerTimes';
import { useSync } from '../context/SyncContext';

interface ProfileViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onNavigateSection: (section: MoreSection) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  settings,
  onUpdateSettings,
  onNavigateSection
}) => {
  const { user, syncStatus, lastSyncTime, signInWithGoogle, signOutUser, notes, bookmarks, amalRecords } = useSync();

  const [profile, setProfile] = useState<UserProfile>(() => storage.getUserProfile());
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || profile.name || settings.userName || 'মুসাফির');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [monthlyChartMode, setMonthlyChartMode] = useState<'cumulative' | 'daily'>('cumulative');

  const quizStats = storage.getQuizStats();
  const rozaStats = storage.getRozaTracker();

  // Count total completed prayers across all real-time recorded days
  let totalPrayersCompleted = 0;
  let totalFastingCompleted = rozaStats.completedDays.length;

  Object.values(amalRecords).forEach((record) => {
    if (record.prayers) {
      if (record.prayers.fajr) totalPrayersCompleted++;
      if (record.prayers.dhuhr) totalPrayersCompleted++;
      if (record.prayers.asr) totalPrayersCompleted++;
      if (record.prayers.maghrib) totalPrayersCompleted++;
      if (record.prayers.isha) totalPrayersCompleted++;
    }
    if (record.fastingDone) totalFastingCompleted++;
  });

  // Calculate spiritual milestone rank legitimately from user's real actions
  const quizAnswered = quizStats.totalAnswered || 0;
  const quizCorrect = quizStats.correctCount || 0;
  const quizPercent = quizAnswered > 0 ? Math.round((quizCorrect / quizAnswered) * 100) : 0;

  let rankTitle = 'মুবতাদী (দ্বীনি শিক্ষার্থী)';
  let rankBadge = '🌱';
  let rankDesc = 'দ্বীনের পথে আপনার নিয়মিত যাত্রা শুরু হয়েছে।';

  if (totalPrayersCompleted >= 50 || quizStats.streak >= 14) {
    rankTitle = 'মুত্তাকী (ধারাবাহিক আমলকারী)';
    rankBadge = '💎';
    rankDesc = 'মাশাআল্লাহ! আপনি সালাত ও দ্বীনি জ্ঞানে ধারাবাহিকতা রক্ষা করছেন।';
  } else if (totalPrayersCompleted >= 20 || quizStats.streak >= 7) {
    rankTitle = 'আমলকারী (নিয়মিত মুসুল্লি)';
    rankBadge = '⭐';
    rankDesc = 'আপনার নিয়মিত আমল ও কুইজ অগ্রগতি প্রশংসনীয়।';
  } else if (totalPrayersCompleted >= 5 || quizAnswered >= 3) {
    rankTitle = 'সালিক (অনুসন্ধিৎসু পথিক)';
    rankBadge = '🌿';
    rankDesc = 'আমল ট্র্যাকার ও সহিহ সুন্নাহ অনুসরণে অগ্রগামী।';
  }

  // Handle saving new name
  const handleSaveName = () => {
    if (!newName.trim()) return;
    triggerHaptic(25);
    const updated = { ...profile, name: newName.trim() };
    setProfile(updated);
    storage.saveUserProfile(updated);
    onUpdateSettings({ userName: newName.trim() });
    setIsEditingName(false);
  };

  // Export all user data as JSON file for backup
  const handleExportData = () => {
    triggerHaptic(30);
    const backup = {
      version: 'waqto_v1',
      exportedAt: new Date().toISOString(),
      profile: storage.getUserProfile(),
      settings: storage.getSettings(),
      notes,
      bookmarks,
      amalRecords,
      quizStats: storage.getQuizStats(),
      rozaTracker: storage.getRozaTracker()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `muslim_reminder_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.notes && Array.isArray(data.notes)) {
          storage.saveNotes(data.notes);
        }
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          storage.saveBookmarks(data.bookmarks);
        }
        if (data.settings) {
          storage.saveSettings(data.settings);
        }
        if (data.profile) {
          storage.saveUserProfile(data.profile);
          setProfile(data.profile);
        }
        triggerHaptic(40);
        setImportStatus('সফলভাবে ব্যাকআপ থেকে ডেটা পুনরুদ্ধার করা হয়েছে!');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setImportStatus('ফাইলটি সঠিক ব্যাকআপ ফাইল নয়।');
      }
    };
    reader.readAsText(file);
  };

  // Generate 7-day consistency data from logged Amal records
  const BENGALI_DAYS_SHORT = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
  const BENGALI_DAYS_FULL = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const BENGALI_MONTHS_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const BENGALI_MONTHS_FULL = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

  const weeklyPrayerStats = useMemo(() => {
    const list = [];
    const now = new Date();
    let totalCompletedInWeek = 0;
    let perfectDays = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const record = amalRecords[dateKey];
      let count = 0;
      const completedNames: string[] = [];

      if (record?.prayers) {
        if (record.prayers.fajr) { count++; completedNames.push('ফজর'); }
        if (record.prayers.dhuhr) { count++; completedNames.push('যোহর'); }
        if (record.prayers.asr) { count++; completedNames.push('আসর'); }
        if (record.prayers.maghrib) { count++; completedNames.push('মাগরিব'); }
        if (record.prayers.isha) { count++; completedNames.push('এশা'); }
      }

      totalCompletedInWeek += count;
      if (count === 5) perfectDays++;

      const isToday = i === 0;
      const dayName = BENGALI_DAYS_SHORT[d.getDay()];
      const fullDayName = BENGALI_DAYS_FULL[d.getDay()];
      const fullDate = `${toBengaliDigits(d.getDate())} ${BENGALI_MONTHS_FULL[d.getMonth()]}, ${toBengaliDigits(d.getFullYear())}`;

      const prayersBreakdown = [
        { name: 'ফজর', done: !!record?.prayers?.fajr },
        { name: 'যোহর', done: !!record?.prayers?.dhuhr },
        { name: 'আসর', done: !!record?.prayers?.asr },
        { name: 'মাগরিব', done: !!record?.prayers?.maghrib },
        { name: 'এশা', done: !!record?.prayers?.isha },
      ];

      list.push({
        dateKey,
        dayName: isToday ? `${dayName} (আজ)` : dayName,
        rawDayName: dayName,
        fullDayName,
        fullDate,
        dateFormatted: `${toBengaliDigits(d.getDate())} ${BENGALI_MONTHS_SHORT[d.getMonth()]}`,
        count,
        percentage: Math.round((count / 5) * 100),
        completedNames,
        prayersBreakdown,
        isToday
      });
    }

    const weeklyAvg = (totalCompletedInWeek / 7).toFixed(1);
    const consistencyRate = Math.round((totalCompletedInWeek / 35) * 100);

    return {
      list,
      totalCompletedInWeek,
      weeklyAvg,
      perfectDays,
      consistencyRate
    };
  }, [amalRecords]);

  // Generate full monthly accumulated amal points trend data
  const monthlyAmalStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayDate = now.getDate();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthNameBn = BENGALI_MONTHS_FULL[currentMonth];

    const list: Array<{
      day: number;
      dayLabel: string;
      fullDate: string;
      dailyPoints: number | null;
      cumulativePoints: number | null;
      prayersCount: number;
      isToday: boolean;
      isPastOrToday: boolean;
    }> = [];

    let runningTotal = 0;
    let activeDays = 0;
    let peakDayPoints = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const isPastOrToday = day <= todayDate;
      const isToday = day === todayDate;
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
      const fullDate = `${toBengaliDigits(day)} ${monthNameBn}`;

      if (isPastOrToday) {
        const record = amalRecords[dateKey];
        let dailyPoints = 0;
        let prayersCount = 0;

        if (record?.prayers) {
          if (record.prayers.fajr) { dailyPoints += 15; prayersCount++; }
          if (record.prayers.dhuhr) { dailyPoints += 15; prayersCount++; }
          if (record.prayers.asr) { dailyPoints += 15; prayersCount++; }
          if (record.prayers.maghrib) { dailyPoints += 15; prayersCount++; }
          if (record.prayers.isha) { dailyPoints += 15; prayersCount++; }
          if (record.prayers.tahajjud) dailyPoints += 10;
          if (record.prayers.chasht) dailyPoints += 10;
        }

        if (record?.morningAzkarDone) dailyPoints += 10;
        if (record?.eveningAzkarDone) dailyPoints += 10;
        if (record?.fastingDone) dailyPoints += 25;
        if (record?.sadaqahDone) dailyPoints += 15;
        if (record?.tasbihCount && record.tasbihCount > 0) {
          dailyPoints += Math.min(20, Math.floor(record.tasbihCount / 33) * 5);
        }
        if (record?.quranReadMinutes && record.quranReadMinutes > 0) {
          dailyPoints += Math.min(25, record.quranReadMinutes * 2);
        }

        if (dailyPoints > 0) activeDays++;
        if (dailyPoints > peakDayPoints) peakDayPoints = dailyPoints;

        runningTotal += dailyPoints;

        list.push({
          day,
          dayLabel: toBengaliDigits(day),
          fullDate,
          dailyPoints,
          cumulativePoints: runningTotal,
          prayersCount,
          isToday,
          isPastOrToday: true
        });
      } else {
        list.push({
          day,
          dayLabel: toBengaliDigits(day),
          fullDate,
          dailyPoints: null,
          cumulativePoints: null,
          prayersCount: 0,
          isToday: false,
          isPastOrToday: false
        });
      }
    }

    const dailyAvg = todayDate > 0 ? Math.round(runningTotal / todayDate) : 0;

    return {
      list,
      totalPoints: runningTotal,
      activeDays,
      dailyAvg,
      peakDayPoints,
      totalDaysInMonth,
      monthNameBn,
      yearBn: toBengaliDigits(currentYear)
    };
  }, [amalRecords]);

  // Enhanced glassmorphism tooltip for monthly line/area chart
  const renderMonthlyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data || data.dailyPoints === null) return null;

      return (
        <div className="bg-white/85 dark:bg-[#1c232d]/90 backdrop-blur-md text-stone-800 dark:text-stone-100 p-3 rounded-2xl shadow-xl shadow-stone-900/10 dark:shadow-black/30 border border-white/80 dark:border-stone-700/60 text-xs space-y-2 min-w-[210px] pointer-events-none ring-1 ring-stone-900/5">
          {/* Header */}
          <div className="border-b border-stone-200/70 dark:border-stone-700/60 pb-1.5 flex items-center justify-between gap-2">
            <span className="font-bold text-[#177a56] dark:text-emerald-400 text-xs flex items-center gap-1.5">
              <span>{data.fullDate}</span>
              {data.isToday && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 font-medium">
                  আজ
                </span>
              )}
            </span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400">
              দিন {toBengaliDigits(data.day)}
            </span>
          </div>

          {/* Points Breakdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 bg-stone-100/70 dark:bg-stone-800/60 p-2 rounded-xl border border-stone-200/60 dark:border-stone-700/50">
              <span className="text-[11px] text-stone-600 dark:text-stone-400">ক্রমপুঞ্জিত মোট:</span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                {toBengaliDigits(data.cumulativePoints)} পয়েন্ট
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 px-1 text-[11px]">
              <span className="text-stone-500 dark:text-stone-400">এই দিনের পয়েন্ট:</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 font-mono">
                +{toBengaliDigits(data.dailyPoints)}
              </span>
            </div>

            {data.prayersCount > 0 && (
              <div className="flex items-center justify-between gap-2 px-1 text-[10px] text-stone-500 dark:text-stone-400">
                <span>আদায়কৃত ওয়াক্ত:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                  {toBengaliDigits(data.prayersCount)} / ৫
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Enhanced interactive Bengali Tooltip for recharts
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/80 dark:bg-[#1c232d]/85 backdrop-blur-md text-stone-800 dark:text-stone-100 p-3 rounded-2xl shadow-xl shadow-stone-900/10 dark:shadow-black/30 border border-white/80 dark:border-stone-700/60 text-xs space-y-2 min-w-[210px] pointer-events-none ring-1 ring-stone-900/5">
          {/* Header: Exact Date & Day */}
          <div className="border-b border-stone-200/70 dark:border-stone-700/60 pb-1.5 flex items-center justify-between gap-2">
            <span className="font-bold text-[#177a56] dark:text-emerald-400 text-xs flex items-center gap-1.5">
              <span>{data.fullDayName}</span>
              {data.isToday && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 font-medium">
                  আজ
                </span>
              )}
            </span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
              {data.fullDate}
            </span>
          </div>

          {/* Exact Prayer Count & Percentage */}
          <div className="flex items-center justify-between gap-3 bg-stone-100/70 dark:bg-stone-800/60 p-2 rounded-xl border border-stone-200/60 dark:border-stone-700/50">
            <div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 block leading-tight">সালাত আদায়</span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-50 font-mono leading-tight">
                {toBengaliDigits(data.count)} <span className="text-xs font-normal text-stone-400 dark:text-stone-400">/ ৫ ওয়াক্ত</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-500 dark:text-stone-400 block leading-tight">ধারাবাহিকতা</span>
              <span className={`text-xs font-bold font-mono leading-tight ${data.count === 5 ? 'text-emerald-600 dark:text-emerald-400' : data.count >= 3 ? 'text-[#177a56] dark:text-emerald-300' : data.count >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-400'}`}>
                {toBengaliDigits(data.percentage)}%
              </span>
            </div>
          </div>

          {/* Individual Prayers Checklist */}
          <div className="space-y-1">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium block">ওয়াক্তভিত্তিক অবস্থা:</span>
            <div className="grid grid-cols-5 gap-1 text-center">
              {data.prayersBreakdown.map((p: { name: string; done: boolean }) => (
                <div
                  key={p.name}
                  className={`py-1 px-0.5 rounded-lg border text-[10px] font-semibold flex flex-col items-center justify-center ${
                    p.done
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-300/80 dark:border-emerald-600/50 text-[#177a56] dark:text-emerald-300'
                      : 'bg-stone-100/70 dark:bg-stone-800/40 border-stone-200/70 dark:border-stone-700/50 text-stone-400 dark:text-stone-500'
                  }`}
                >
                  <span className="leading-tight">{p.name}</span>
                  <span className="text-[9px] leading-tight mt-0.5 font-bold">
                    {p.done ? '✓' : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom animated bar shape using framer-motion (grows upwards from base on initial load)
  const CustomAnimatedBar = (barProps: any) => {
    const { 
      x = 0, 
      y = 0, 
      width = 0, 
      height = 0, 
      fill = '#177a56', 
      index = 0,
      onMouseEnter,
      onMouseLeave,
      onClick
    } = barProps;
    const hasMounted = useRef(false);

    useEffect(() => {
      hasMounted.current = true;
    }, []);

    if (width <= 0) return null;

    const barHeight = Math.max(height, 0);
    const baseY = y + barHeight;

    return (
      <motion.rect
        x={x}
        width={width}
        rx={6}
        ry={6}
        fill={fill}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        initial={hasMounted.current ? false : { height: 0, y: baseY, opacity: 0.2 }}
        animate={{ height: barHeight, y: y, opacity: 1 }}
        transition={{
          duration: 0.65,
          delay: (index || 0) * 0.08 + 0.12,
          ease: [0.22, 1, 0.36, 1]
        }}
        whileHover={{
          filter: 'brightness(1.1) drop-shadow(0 3px 6px rgba(16, 185, 129, 0.45))',
          transition: { duration: 0.15 }
        }}
      />
    );
  };

  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Profile Hero Card */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-stone-900 text-white rounded-3xl p-5 shadow-lg border border-emerald-700/40 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 border border-emerald-500/10 rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-2xl font-bold shadow-inner">
              {rankBadge}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="px-2 py-0.5 text-sm bg-white/20 border border-white/30 rounded-lg text-white font-bold focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold tracking-tight">
                      {user?.displayName || profile.name || settings.userName || 'মুসাফির'}
                    </h2>
                    <button
                      onClick={() => {
                        setNewName(user?.displayName || profile.name || settings.userName || 'মুসাফির');
                        setIsEditingName(true);
                      }}
                      className="text-emerald-300 hover:text-white p-0.5 cursor-pointer"
                      title="নাম পরিবর্তন করুন"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              <div className="text-xs text-emerald-300 font-medium">
                {rankTitle}
              </div>
              <p className="text-[11px] text-emerald-100/80 line-clamp-1">
                {rankDesc}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateSection('ranking')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors cursor-pointer shrink-0"
            title="র‍্যাংকিং ও মাইলস্টোন দেখুন"
          >
            <Trophy className="w-5 h-5 text-amber-300" />
            <span className="text-[10px] text-amber-200 font-semibold">র‍্যাংকিং</span>
          </button>
        </div>
      </div>

      {/* 2. Real-Time Cloud Synchronization & Account Card */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              ফায়ারবেস ক্লাউড সিঙ্ক্রোনাইজেশন
            </h3>
          </div>
          {user && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              রিয়েল-টাইম
            </span>
          )}
        </div>

        {user ? (
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                  {user.displayName || 'গুগল ব্যবহারকারী'}
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                  {user.email}
                </span>
              </div>
              <button
                onClick={() => signOutUser()}
                className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                <span>লগআউট</span>
              </button>
            </div>

            <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1">
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                    <span>সিঙ্ক করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>ক্লাউডে সংরক্ষিত ও ডিভাইসসমূহে সিঙ্কড</span>
                  </>
                )}
              </span>
              {lastSyncTime && (
                <span className="font-mono text-[10px]">
                  {new Date(lastSyncTime).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
            <div>
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                সকল ডিভাইসে স্বয়ংক্রিয় সিঙ্ক সক্রিয় করুন
              </h4>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed mt-0.5">
                আপনার গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন করলে আপনার সকল ব্যক্তিগত নোট, বুকমার্ক এবং সালাত ট্র্যাকার সকল মোবাইল ও কম্পিউটারে রিয়েল-টাইমে সংরক্ষিত থাকবে।
              </p>
            </div>
            <button
              onClick={() => signInWithGoogle()}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>গুগল অ্যাকাউন্ট দিয়ে সিঙ্ক করুন</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Weekly Prayer Consistency Graph (Recharts + Framer Motion) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                সাপ্তাহিক সালাত ধারাবাহিকতা
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                আমল ট্র্যাকার অনুসারে গত ৭ দিনের ৫ ওয়াক্ত সালাত
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-300 text-xs font-bold border border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{toBengaliDigits(weeklyPrayerStats.consistencyRate)}%</span>
            </span>
          </div>
        </div>

        {/* Weekly Metric Badges */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="grid grid-cols-3 gap-2 pt-1"
        >
          <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 block">সাপ্তাহিক মোট</span>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100 font-mono">
              {toBengaliDigits(weeklyPrayerStats.totalCompletedInWeek)} <span className="text-[10px] text-stone-400 font-normal">/ ৩৫</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 block">দৈনিক গড়</span>
            <span className="text-sm font-bold text-[#177a56] dark:text-emerald-400 font-mono">
              {toBengaliDigits(weeklyPrayerStats.weeklyAvg)} <span className="text-[10px] text-stone-400 font-normal">/ ৫</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 block">পূর্ণ ৫ ওয়াক্ত</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
              {toBengaliDigits(weeklyPrayerStats.perfectDays)} দিন
            </span>
          </div>
        </motion.div>

        {/* Recharts Bar Graph with upward growth animation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
          className="pt-2 pb-1 w-full h-52"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyPrayerStats.list}
              margin={{ top: 12, right: 8, left: -24, bottom: 4 }}
              accessibilityLayer={false}
              style={{ outline: 'none' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" vertical={false} />
              <XAxis
                dataKey="dayName"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                tickFormatter={(v) => toBengaliDigits(v)}
              />
              <Tooltip 
                content={renderCustomTooltip} 
                cursor={{ fill: 'rgba(16, 185, 129, 0.1)', rx: 8, ry: 8 }}
                wrapperStyle={{ outline: 'none', zIndex: 100 }}
              />
              <Bar 
                dataKey="count" 
                shape={(props: any) => <CustomAnimatedBar {...props} />}
                maxBarSize={38}
                isAnimationActive={false}
              >
                {weeklyPrayerStats.list.map((entry, index) => {
                  let fillColor = '#177a56';
                  if (entry.count === 5) fillColor = '#10b981';
                  else if (entry.count >= 3) fillColor = '#177a56';
                  else if (entry.count >= 1) fillColor = '#f59e0b';
                  else fillColor = 'rgba(156, 163, 175, 0.35)';

                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Graph Legend & Tracker Link */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span>পূর্ণ ৫ ওয়াক্ত</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#177a56]" />
              <span>৩-৪ ওয়াক্ত</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              <span>১-২ ওয়াক্ত</span>
            </span>
          </div>

          <button
            onClick={() => onNavigateSection('tracker')}
            className="text-xs font-bold text-[#177a56] dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <span>আমল ট্র্যাকার</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>

      {/* 4. Monthly Amal Points Accumulation Trend (Line/Area Chart with Glassmorphism) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
        className="bg-white/85 dark:bg-[#151B22]/90 backdrop-blur-md rounded-2xl p-4 shadow-xs border border-stone-200/80 dark:border-stone-800/80 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  মাসিক আমল পয়েন্ট ট্রেন্ড
                </h3>
                <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-1.5 py-0.2 rounded-md border border-emerald-300/60 dark:border-emerald-700/50">
                  {monthlyAmalStats.monthNameBn} {monthlyAmalStats.yearBn}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                চলতি মাসে সঞ্চিত মোট নেকি ও আমল পয়েন্টের গতিপথ
              </p>
            </div>
          </div>

          {/* Toggle: Cumulative vs Daily */}
          <div className="flex items-center p-0.5 bg-stone-100/80 dark:bg-stone-800/80 rounded-xl self-start sm:self-auto border border-stone-200/60 dark:border-stone-700/60 text-[10px] font-semibold">
            <button
              onClick={() => {
                triggerHaptic(15);
                setMonthlyChartMode('cumulative');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                monthlyChartMode === 'cumulative'
                  ? 'bg-white dark:bg-stone-700 text-emerald-800 dark:text-emerald-300 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
              }`}
            >
              ক্রমপুঞ্জিত মোট
            </button>
            <button
              onClick={() => {
                triggerHaptic(15);
                setMonthlyChartMode('daily');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                monthlyChartMode === 'daily'
                  ? 'bg-white dark:bg-stone-700 text-emerald-800 dark:text-emerald-300 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
              }`}
            >
              দৈনিক পয়েন্ট
            </button>
          </div>
        </div>

        {/* Monthly Key Metrics (Frosted Glass Pills) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-stone-800/40 backdrop-blur-xs border border-stone-200/60 dark:border-stone-700/50 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 block">এই মাসের মোট</span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              {toBengaliDigits(monthlyAmalStats.totalPoints)} <span className="text-[10px] text-stone-400 font-normal">পয়েন্ট</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-stone-800/40 backdrop-blur-xs border border-stone-200/60 dark:border-stone-700/50 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 block">দৈনিক গড়</span>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100 font-mono">
              {toBengaliDigits(monthlyAmalStats.dailyAvg)} <span className="text-[10px] text-stone-400 font-normal">পয়েন্ট</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-stone-800/40 backdrop-blur-xs border border-stone-200/60 dark:border-stone-700/50 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 block">সক্রিয় আমল দিন</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
              {toBengaliDigits(monthlyAmalStats.activeDays)} <span className="text-[10px] text-stone-400 font-normal">/ {toBengaliDigits(monthlyAmalStats.totalDaysInMonth)}</span>
            </span>
          </div>
        </div>

        {/* Monthly Line/Area Chart */}
        <div className="pt-2 pb-1 w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyAmalStats.list}
              margin={{ top: 12, right: 10, left: -20, bottom: 4 }}
              accessibilityLayer={false}
              style={{ outline: 'none' }}
            >
              <defs>
                <linearGradient id="monthlyPointsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.12)" vertical={false} />
              <XAxis
                dataKey="day"
                ticks={[1, 5, 10, 15, 20, 25, monthlyAmalStats.totalDaysInMonth]}
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                tickFormatter={(v) => toBengaliDigits(v)}
              />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                tickFormatter={(v) => toBengaliDigits(v)}
              />
              <Tooltip 
                content={renderMonthlyTooltip}
                cursor={{ stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                wrapperStyle={{ outline: 'none', zIndex: 100 }}
              />
              <Area
                type="monotone"
                dataKey={monthlyChartMode === 'cumulative' ? 'cumulativePoints' : 'dailyPoints'}
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#monthlyPointsGradient)"
                dot={{ fill: '#10b981', r: 2, strokeWidth: 1, stroke: '#ffffff' }}
                activeDot={{ 
                  r: 5, 
                  fill: '#10b981', 
                  stroke: '#ffffff', 
                  strokeWidth: 2, 
                  filter: 'drop-shadow(0 2px 6px rgba(16, 185, 129, 0.5))' 
                }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer info & streak milestone */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {monthlyChartMode === 'cumulative' ? 'সঞ্চিত মোট পয়েন্ট বৃদ্ধি' : 'প্রতিদিনের অর্জিত পয়েন্ট'}
            </span>
          </div>

          <span className="font-medium text-stone-600 dark:text-stone-300">
            সর্বোচ্চ একদিনে: <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{toBengaliDigits(monthlyAmalStats.peakDayPoints)}</strong> পয়েন্ট
          </span>
        </div>
      </motion.div>

      {/* 5. Real Verified Deeni Stats Grid */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
          আপনার বাস্তব আমল ও শিক্ষা পরিসংখ্যান
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">
              {toBengaliDigits(totalPrayersCompleted)}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              আদায়কৃত সালাত
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-center">
            <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">
              {toBengaliDigits(quizStats.streak)} দিন
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              কুইজ স্ট্রিক
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-center">
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">
              {toBengaliDigits(notes.length)}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              ব্যক্তিগত নোট
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-center">
            <Bookmark className="w-4 h-4 text-teal-600 dark:text-teal-400 mx-auto mb-1" />
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">
              {toBengaliDigits(bookmarks.length)}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              বুকমার্কসমূহ
            </div>
          </div>
        </div>

        {/* Detailed Accuracy */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
          <span>কুইজ নির্ভুলতার হার:</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
            {toBengaliDigits(quizPercent)}% ({toBengaliDigits(quizCorrect)}/{toBengaliDigits(quizAnswered)})
          </span>
        </div>
      </div>

      {/* 4. Data Backup, Export & Restore */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>ডেটা ব্যাকআপ ও পুনরুদ্ধার (অফলাইন ফাইল)</span>
        </h3>

        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-normal">
          আপনার সকল ব্যক্তিগত নোট, বুকমার্ক ও আমল হিস্ট্রি ব্যাকআপ ফাইল হিসেবে ডাউনলোড করে রাখতে পারেন এবং যেকোনো সময় পুনরায় রিস্টোর করতে পারেন।
        </p>

        {importStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
            {importStatus}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={handleExportData}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ব্যাকআপ ডাউনলোড করুন (JSON)</span>
          </button>

          <label className="flex-1 py-2 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-stone-200 dark:border-stone-700">
            <Upload className="w-3.5 h-3.5" />
            <span>ব্যাকআপ রিস্টোর করুন</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 5. Quick Shortcuts */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onNavigateSection('notes')}
          className="p-3 rounded-2xl bg-white dark:bg-[#151B22] border border-stone-200 dark:border-stone-800 shadow-xs text-left hover:border-emerald-500/40 transition-colors flex items-center justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-bold text-stone-900 dark:text-stone-100">আমার নোট</div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">{notes.length}টি চিন্তা সংরক্ষিত</div>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400" />
        </button>

        <button
          onClick={() => onNavigateSection('bookmarks')}
          className="p-3 rounded-2xl bg-white dark:bg-[#151B22] border border-stone-200 dark:border-stone-800 shadow-xs text-left hover:border-emerald-500/40 transition-colors flex items-center justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-bold text-stone-900 dark:text-stone-100">আমার বুকমার্ক</div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">{bookmarks.length}টি আয়াত ও দোয়া</div>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400" />
        </button>
      </div>

      {/* 6. Exclusive Admin Control Panel Access (Locked to nafiulislam3810@gmail.com) */}
      <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 border border-emerald-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white">
              প্রধান অ্যাডমিন কন্ট্রোল প্যানেল
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5 truncate">
              {user?.email?.toLowerCase() === 'nafiulislam3810@gmail.com'
                ? 'প্রধান অ্যাডমিন (nafiulislam3810@gmail.com) হিসেবে যাচাইকৃত'
                : 'শুধুমাত্র প্রধান অ্যাডমিনের (nafiulislam3810@gmail.com) জন্য সংরক্ষিত'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('waqto-open-admin'))}
          className="px-3.5 py-2 rounded-xl bg-[#177a56] hover:bg-[#126446] text-white text-xs font-bold shrink-0 cursor-pointer transition-colors"
        >
          অ্যাডমিন প্যানেল →
        </button>
      </div>
    </div>
  );
};
