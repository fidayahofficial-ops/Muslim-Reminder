import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  Undo2, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  ChevronsUpDown, 
  Flag, 
  X, 
  Check, 
  BookOpen, 
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toBengaliDigits } from '../utils/prayerTimes';
import { soundManager, triggerHaptic } from '../utils/audio';
import { useSync } from '../context/SyncContext';

interface TasbihViewProps {
  onBack: () => void;
}

export interface DhikrItem {
  id: string;
  arabic: string;
  nameBn: string;
  meaningBn: string;
  defaultTarget: number;
  rewardBn?: string;
}

export const DHIKR_LIST: DhikrItem[] = [
  {
    id: 'astagfirullah',
    arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ',
    nameBn: 'আস্তাগফিরুল্লাহ',
    meaningBn: 'আমি আল্লাহর কাছে ক্ষমা চাই',
    defaultTarget: 33,
    rewardBn: 'প্রতি ১০০ বারে গুনাহ মাফ ও অন্তরের প্রশান্তি'
  },
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ ٱللَّٰهِ',
    nameBn: 'সুবহানাল্লাহ',
    meaningBn: 'আল্লাহ অতি পবিত্র ও মহান',
    defaultTarget: 33,
    rewardBn: 'জান্নাতে একটি খেজুর গাছ রোপণ করা হয়'
  },
  {
    id: 'alhamdulillah',
    arabic: 'ٱلْحَمْدُ لِلَّٰهِ',
    nameBn: 'আলহামদুলিল্লাহ',
    meaningBn: 'সকল প্রশংসা কেবল আল্লাহর জন্য',
    defaultTarget: 33,
    rewardBn: 'মিজানের পাল্লা নেকিতে পরিপূর্ণ করে দেয়'
  },
  {
    id: 'allahuakbar',
    arabic: 'ٱللَّٰهُ أَكْبَرُ',
    nameBn: 'আল্লাহু আকবার',
    meaningBn: 'আল্লাহ সর্বশ্রেষ্ঠ',
    defaultTarget: 34,
    rewardBn: 'আসমান ও জমিনের মধ্যবর্তী স্থান পূর্ণ করে'
  },
  {
    id: 'lailahaillallah',
    arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ',
    nameBn: 'লা ইলাহা ইল্লাল্লাহ',
    meaningBn: 'আল্লাহ ছাড়া সত্য কোনো উপাস্য নেই',
    defaultTarget: 100,
    rewardBn: 'সর্বশ্রেষ্ঠ জিকির ও জান্নাতের চাবিকাঠি'
  },
  {
    id: 'durood',
    arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
    nameBn: 'আল্লাহুম্মা সাল্লি আলা মুহাম্মদ',
    meaningBn: 'হে আল্লাহ! মুহাম্মদের ওপর রহমত বর্ষণ করুন',
    defaultTarget: 100,
    rewardBn: 'একবার পাঠে ১০টি রহমত, ১০টি গুনাহ মাফ ও ১০টি মর্যাদা বৃদ্ধি'
  },
  {
    id: 'subhanallahi_bihamdihi',
    arabic: 'سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ',
    nameBn: 'সুবহানাল্লাহি ওয়া বিহামদিহী',
    meaningBn: 'আল্লাহর প্রশংসাসহ তাঁর পবিত্রতা ঘোষণা করছি',
    defaultTarget: 100,
    rewardBn: 'দিনে ১০০ বার পাঠে সমুদ্রের ফেনা পরিমাণ গুনাহও মাফ হয়'
  },
  {
    id: 'hawqala',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّٰهِ',
    nameBn: 'লা হাওলা ওয়ালা কুওয়াতা ইল্লা বিল্লাহ',
    meaningBn: 'আল্লাহর সাহায্য ছাড়া কোনো শক্তি বা সামর্থ্য নেই',
    defaultTarget: 100,
    rewardBn: 'জান্নাতের অমূল্য রত্নভাণ্ডারের একটি'
  },
  {
    id: 'hasbunallah',
    arabic: 'حَسْبُنَا ٱللَّٰهُ وَنِعْمَ ٱلْوَكِيلُ',
    nameBn: 'হাসবুনাল্লাহু ওয়া নিমাল ওয়াকিল',
    meaningBn: 'আল্লাহই আমাদের জন্য যথেষ্ট এবং তিনিই উত্তম কর্মবিধায়ক',
    defaultTarget: 100,
    rewardBn: 'সকল বিপদ-আপদ ও দুশ্চিন্তা থেকে মুক্তির মহাঔষধ'
  },
  {
    id: 'yunus_dua',
    arabic: 'لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَٰنَكَ إِنِّي كُنتُ مِنَ ٱلظَّٰلِمِينَ',
    nameBn: 'দোয়া ইউনুস',
    meaningBn: 'তুমি ছাড়া সত্য কোনো উপাস্য নেই, তুমি পবিত্র; নিশ্চয় আমি সীমালঙ্ঘনকারীদের অন্তর্ভুক্ত',
    defaultTarget: 100,
    rewardBn: 'কঠিন বিপদ ও সংকট থেকে নিস্তার লাভের পরীক্ষিত আমল'
  }
];

const TARGET_OPTIONS = [33, 99, 100, Infinity];

export const TasbihView: React.FC<TasbihViewProps> = ({ onBack }) => {
  const { amalRecords, saveAmalRecord } = useSync();

  // Storage state initialization
  const [selectedDhikrId, setSelectedDhikrId] = useState<string>(() => {
    try {
      return localStorage.getItem('waqto_tasbih_selected_id') || DHIKR_LIST[0].id;
    } catch {
      return DHIKR_LIST[0].id;
    }
  });

  const selectedDhikr = DHIKR_LIST.find(d => d.id === selectedDhikrId) || DHIKR_LIST[0];

  const [target, setTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('waqto_tasbih_target');
      if (saved === 'infinity') return Infinity;
      if (saved) return parseInt(saved, 10);
      return selectedDhikr.defaultTarget;
    } catch {
      return selectedDhikr.defaultTarget;
    }
  });

  // Continuous count displayed on center button
  const [count, setCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`waqto_tasbih_curr_${selectedDhikrId}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Track all-time count per dhikr
  const [dhikrCounts, setDhikrCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('waqto_tasbih_dhikr_totals');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sound and Vibrate toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('waqto_tasbih_sound') !== 'false';
    } catch {
      return true;
    }
  });

  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('waqto_tasbih_vibrate') !== 'false';
    } catch {
      return true;
    }
  });

  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [coinNotification, setCoinNotification] = useState<string | null>(null);
  const [isTappedAnim, setIsTappedAnim] = useState<boolean>(false);
  const [ripples, setRipples] = useState<number[]>([]);
  const tapAnimTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayAmalCount = amalRecords[todayKey]?.tasbihCount || 0;

  // Calculate all-time total across all dhikrs
  const allTimeTotal = Object.values(dhikrCounts).reduce((acc, curr) => acc + (curr || 0), 0);

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('waqto_tasbih_selected_id', selectedDhikrId);
      localStorage.setItem(`waqto_tasbih_curr_${selectedDhikrId}`, count.toString());
      localStorage.setItem('waqto_tasbih_target', target === Infinity ? 'infinity' : target.toString());
      localStorage.setItem('waqto_tasbih_dhikr_totals', JSON.stringify(dhikrCounts));
      localStorage.setItem('waqto_tasbih_sound', soundEnabled.toString());
      localStorage.setItem('waqto_tasbih_vibrate', vibrateEnabled.toString());
    } catch {}
  }, [selectedDhikrId, count, target, dhikrCounts, soundEnabled, vibrateEnabled]);

  // Completed laps calculation based on continuous count and target
  const completedLaps = target === Infinity ? 0 : Math.floor(count / target);

  // Handle tap increment
  const handleTap = () => {
    if (vibrateEnabled) {
      triggerHaptic(28);
    }
    if (soundEnabled) {
      soundManager.playTasbihClick(880 + (count % 33) * 10);
    }

    // Trigger visual scale animation on button
    setIsTappedAnim(true);
    if (tapAnimTimeoutRef.current) clearTimeout(tapAnimTimeoutRef.current);
    tapAnimTimeoutRef.current = setTimeout(() => setIsTappedAnim(false), 110);

    // Trigger subtle ripple pulse
    const rippleId = Date.now();
    setRipples(prev => [...prev.slice(-2), rippleId]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r !== rippleId));
    }, 600);

    const nextCount = count + 1;

    // Update dhikr count
    setDhikrCounts(prev => ({
      ...prev,
      [selectedDhikrId]: (prev[selectedDhikrId] || 0) + 1
    }));

    // Update today's amalRecord
    const currentRec = amalRecords[todayKey] || {
      dateKey: todayKey,
      prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      morningAzkarDone: false,
      eveningAzkarDone: false,
      fastingDone: false,
      sadaqahDone: false,
      tasbihCount: 0
    };
    saveAmalRecord({
      ...currentRec,
      tasbihCount: (currentRec.tasbihCount || 0) + 1
    });

    // Check if a lap cycle was completed
    if (target !== Infinity && nextCount % target === 0) {
      if (vibrateEnabled) {
        triggerHaptic([50, 80, 50]);
      }
      setCoinNotification(`+৫০ কয়েন অর্জিত! (${toBengaliDigits(target)} বার সম্পন্ন)`);
      setTimeout(() => setCoinNotification(null), 2500);

      try {
        confetti({
          particleCount: 24,
          spread: 50,
          origin: { y: 0.65 },
          colors: ['#1ea476', '#57a88b', '#f59e0b', '#ffffff']
        });
      } catch {}
    }

    setCount(nextCount);
  };

  // Decrement by 1 (Undo)
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count > 0) {
      if (vibrateEnabled) triggerHaptic(20);
      setCount(prev => prev - 1);
      setDhikrCounts(prev => ({
        ...prev,
        [selectedDhikrId]: Math.max(0, (prev[selectedDhikrId] || 0) - 1)
      }));
    }
  };

  // Reset current count
  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vibrateEnabled) triggerHaptic(35);
    setCount(0);
  };

  // Select a new Dhikr
  const handleSelectDhikr = (dhikr: DhikrItem) => {
    setSelectedDhikrId(dhikr.id);
    const savedCurr = parseInt(localStorage.getItem(`waqto_tasbih_curr_${dhikr.id}`) || '0', 10);
    setCount(savedCurr);
    setTarget(dhikr.defaultTarget);
    setIsPickerOpen(false);
    if (vibrateEnabled) triggerHaptic(20);
  };

  // Progress Calculations for SVG dial
  // Progress is cyclic within the active target (or 100 for Infinity)
  const cycleTarget = target === Infinity ? 100 : target;
  const cycleCount = count % cycleTarget;
  const progressPercent = cycleTarget > 0 ? (cycleCount / cycleTarget) : 0;

  // SVG Dial geometry (viewBox 0 0 280 280)
  const cx = 140;
  const cy = 140;
  const radius = 104; // circle track radius
  const circumference = 2 * Math.PI * radius; // ≈ 653.45
  const strokeDashoffset = circumference - circumference * progressPercent;

  // Calculate indicator bead coordinates along the track circumference
  // Starts at top (-90 degrees) and rotates clockwise
  const angleDeg = -90 + progressPercent * 360;
  const angleRad = (angleDeg * Math.PI) / 180;
  const beadX = cx + radius * Math.cos(angleRad);
  const beadY = cy + radius * Math.sin(angleRad);

  // Coins earned today from Tasbih (50 coins per 100, max 300 daily)
  const todayCoins = Math.min(300, Math.floor(todayAmalCount / 100) * 50);

  return (
    <div className="min-h-screen bg-[#edf8f4] dark:bg-[#0c1511] text-stone-900 dark:text-stone-100 select-none pb-28 pt-2 px-3 sm:px-4 max-w-md mx-auto flex flex-col space-y-3.5 animate-fadeIn">
      {/* Coin notification toast */}
      {coinNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-amber-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 border border-amber-300 shadow-xl whitespace-nowrap">
            <Coins className="w-4 h-4 fill-white animate-spin" />
            <span>{coinNotification}</span>
          </div>
        </div>
      )}

      {/* Top Header: Back Button, Title, and Audio/Haptic Controls */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 text-stone-800 dark:text-stone-200 hover:opacity-75 transition-opacity cursor-pointer flex items-center justify-center"
            title="ফিরে যান"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          </button>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            তাসবিহ
          </h1>
        </div>

        {/* Audio & Haptic Toggle Controls */}
        <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200">
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1.5 hover:opacity-75 transition-opacity cursor-pointer"
            title={soundEnabled ? 'সাউন্ড বন্ধ করুন' : 'সাউন্ড চালু করুন'}
            aria-label="সাউন্ড টগল"
          >
            {soundEnabled ? (
              <Volume2 className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <VolumeX className="w-6 h-6 text-stone-400 stroke-[2.2]" />
            )}
          </button>

          <button
            onClick={() => setVibrateEnabled(prev => !prev)}
            className="p-1.5 hover:opacity-75 transition-opacity cursor-pointer"
            title={vibrateEnabled ? 'ভাইব্রেশন বন্ধ করুন' : 'ভাইব্রেশন চালু করুন'}
            aria-label="ভাইব্রেশন টগল"
          >
            <Smartphone 
              className={`w-6 h-6 stroke-[2.2] ${vibrateEnabled ? 'text-stone-800 dark:text-stone-200' : 'text-stone-400'}`} 
            />
          </button>
        </div>
      </div>

      {/* Reward Motivation Banner Pill */}
      <div className="flex justify-center">
        <div className="px-4 py-1.5 rounded-full bg-[#fef8eb] dark:bg-amber-950/40 border border-[#fae8c8] dark:border-amber-800/40 flex items-center gap-1.5 text-xs text-[#a06616] dark:text-amber-300 font-medium shadow-2xs">
          <span className="text-amber-500 font-bold text-sm leading-none">★</span>
          <span>পুরস্কার: প্রতি ১০০ বারে +৫০ কয়েন</span>
        </div>
      </div>

      {/* Active Dhikr Selector Card */}
      <div className="flex flex-col items-center space-y-2 pt-0.5">
        {/* Selector Pill Button */}
        <button
          onClick={() => setIsPickerOpen(true)}
          className="w-full max-w-xs bg-white dark:bg-[#15231c] rounded-full px-5 py-2.5 border border-stone-200/90 dark:border-stone-800/80 shadow-xs flex items-center justify-between text-stone-800 dark:text-stone-100 font-bold text-sm hover:border-[#1ea476]/60 transition-all cursor-pointer"
        >
          <span className="truncate">{selectedDhikr.nameBn}</span>
          <ChevronsUpDown className="w-4 h-4 text-stone-500 shrink-0 ml-2" />
        </button>

        {/* Arabic Calligraphy in Emerald Green */}
        <div className="text-center pt-1 pb-0.5">
          <p className="font-arabic text-3xl sm:text-4xl text-[#1ea476] dark:text-[#2dd49d] font-bold tracking-normal leading-relaxed drop-shadow-2xs">
            {selectedDhikr.arabic}
          </p>
          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-medium mt-0.5">
            “{selectedDhikr.meaningBn}”
          </p>
        </div>
      </div>

      {/* Target / Goal Selector Pills */}
      <div className="flex items-center justify-center gap-2.5 pt-0.5">
        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mr-0.5">
          লক্ষ্য:
        </span>
        {TARGET_OPTIONS.map((opt) => {
          const isSelected = target === opt;
          const label = opt === Infinity ? '∞' : toBengaliDigits(opt);
          return (
            <button
              key={opt.toString()}
              onClick={() => {
                setTarget(opt);
                if (vibrateEnabled) triggerHaptic(18);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#ddf4ec] dark:bg-[#133026] text-[#1ea476] dark:text-[#2dd49d] border-2 border-[#1ea476] dark:border-[#2dd49d] shadow-xs'
                  : 'bg-white dark:bg-[#15231c] text-stone-700 dark:text-stone-300 border border-stone-200/90 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* CENTER CIRCULAR BUTTON WITH SVG TRACK, PROGRESS ARC, AND HOLLOW BEAD */}
      <div className="relative flex flex-col items-center justify-center py-2">
        {/* Ripple feedback waves on tap */}
        {ripples.map((id) => (
          <span
            key={id}
            className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-[#1ea476]/40 dark:border-[#2dd49d]/30 animate-ping pointer-events-none"
          />
        ))}

        {/* Container for SVG ring and Center Tap Button */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center touch-manipulation">
          {/* SVG Progress Ring */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 280 280"
          >
            {/* Outer faint guideline ring */}
            <circle
              cx={cx}
              cy={cy}
              r="118"
              fill="none"
              stroke="#dff0e8"
              strokeWidth="1.5"
              className="dark:stroke-emerald-950/40"
            />

            {/* Base pale mint track */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#cfece0"
              strokeWidth="13"
              className="dark:stroke-emerald-950/70"
            />

            {/* Solid vibrant emerald progress arc */}
            {progressPercent > 0 && (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="#1ea476"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                className="transition-all duration-150 ease-out"
              />
            )}

            {/* Hollow White Indicator Bead at head of progress */}
            <circle
              cx={beadX}
              cy={beadY}
              r="10.5"
              fill="#ffffff"
              stroke="#1ea476"
              strokeWidth="3.5"
              className="transition-all duration-150 ease-out"
            />
          </svg>

          {/* Large Center Green Circular Button */}
          <button
            onPointerDown={handleTap}
            className={`w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-[#57a88b] dark:bg-[#499479] text-white flex flex-col items-center justify-center shadow-[0_12px_28px_rgba(87,168,139,0.38)] cursor-pointer select-none touch-manipulation transition-transform duration-100 ease-out ${
              isTappedAnim ? 'scale-[0.95]' : 'scale-100 hover:scale-[1.01]'
            }`}
            aria-label="তাসবিহ গণনা ট্যাপ করুন"
          >
            {/* Big Count Digits in Bengali */}
            <span
              className={`text-5xl sm:text-[56px] font-black font-mono tracking-tight text-white leading-none drop-shadow-xs transition-transform duration-100 ${
                isTappedAnim ? 'scale-105' : 'scale-100'
              }`}
            >
              {toBengaliDigits(count)}
            </span>

            {/* "বার" subtitle */}
            <span className="text-sm font-semibold text-white/95 mt-1 tracking-wider">
              বার
            </span>
          </button>
        </div>
      </div>

      {/* Target & Lap info pill */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white dark:bg-[#15231c] border border-stone-200/90 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 font-medium shadow-xs">
          <Flag className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
          <span>লক্ষ্য: {target === Infinity ? 'সীমাহীন' : `${toBengaliDigits(target)} বার`}</span>
          <span className="text-stone-300 dark:text-stone-700 font-light">|</span>
          <span>সম্পন্ন চক্র: {toBengaliDigits(completedLaps)}</span>
        </div>
      </div>

      {/* Action Buttons: [ ↩ -১ ] and [ ↺ শূন্য করুন ] */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          onClick={handleDecrement}
          disabled={count === 0}
          className={`px-5 py-2.5 rounded-2xl border text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
            count === 0
              ? 'bg-stone-100/70 dark:bg-stone-850/60 border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-60'
              : 'bg-white dark:bg-[#15231c] border-stone-200/90 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 active:scale-95'
          }`}
          title="১ বিয়োগ করুন"
        >
          <Undo2 className="w-4 h-4 stroke-[2.2]" />
          <span>-১</span>
        </button>

        <button
          onClick={handleReset}
          className="px-5 py-2.5 rounded-2xl bg-white dark:bg-[#15231c] border border-stone-200/90 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
          title="গণনা শূন্য করুন"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.2]" />
          <span>শূন্য করুন</span>
        </button>
      </div>

      {/* Bottom Summary Stats: 3 Columns */}
      <div className="pt-2">
        <div className="grid grid-cols-3 gap-2.5 text-center">
          {/* Card 1: Today's Total */}
          <div className="bg-white dark:bg-[#15231c] rounded-2xl p-3 border border-stone-200/90 dark:border-stone-800/80 shadow-xs">
            <span className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
              আজকের মোট
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
              {toBengaliDigits(todayAmalCount)}
            </span>
          </div>

          {/* Card 2: Today's Coins */}
          <div className="bg-white dark:bg-[#15231c] rounded-2xl p-3 border border-stone-200/90 dark:border-stone-800/80 shadow-xs">
            <span className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
              আজকের কয়েন
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
              {toBengaliDigits(todayCoins)}/৩০০
            </span>
          </div>

          {/* Card 3: All-Time Total */}
          <div className="bg-white dark:bg-[#15231c] rounded-2xl p-3 border border-stone-200/90 dark:border-stone-800/80 shadow-xs">
            <span className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
              সর্বমোট
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
              {toBengaliDigits(Math.max(allTimeTotal, todayAmalCount))}
            </span>
          </div>
        </div>

        {/* Motivational / reward explanation note */}
        <p className="text-center text-xs text-stone-500 dark:text-stone-400 mt-3 font-medium">
          প্রতি ১০০ বার তাসবিহে ৫০ কয়েন (দিনে সর্বোচ্চ ৩০০)
        </p>
      </div>

      {/* Dhikr Selector Bottom Sheet Modal */}
      {isPickerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#131b17] rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 animate-slideUp overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#1ea476] dark:text-emerald-300 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">
                    জিকির নির্বাচন করুন
                  </h3>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    ক্লিক করে আপনার পছন্দের জিকির বেছে নিন
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors cursor-pointer"
                aria-label="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Dhikr List */}
            <div className="p-3 overflow-y-auto space-y-2 divide-y divide-stone-100 dark:divide-stone-800/60">
              {DHIKR_LIST.map((item) => {
                const isSelected = item.id === selectedDhikrId;
                const countThisDhikr = dhikrCounts[item.id] || 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectDhikr(item)}
                    className={`w-full pt-2.5 pb-2 px-3 rounded-2xl text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#ddf4ec] dark:bg-emerald-950/40 border border-[#1ea476]/50'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-850 border border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {item.nameBn}
                        </span>
                        {isSelected && (
                          <span className="p-0.5 rounded-full bg-[#1ea476] text-white">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="font-arabic text-base text-[#1ea476] dark:text-[#2dd49d] font-medium my-0.5">
                        {item.arabic}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                        {item.meaningBn}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                        {toBengaliDigits(countThisDhikr)} বার
                      </span>
                      <span className="block text-[10px] text-stone-400 mt-1">
                        টার্গেট: {toBengaliDigits(item.defaultTarget)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
