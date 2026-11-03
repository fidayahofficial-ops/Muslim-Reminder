import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  Moon,
  Plane,
  Sparkles
} from 'lucide-react';
import { UserSettings } from '../types';
import { formatBengaliDate, getHijriDate, toBengaliDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

interface HajjCountdownViewProps {
  settings: UserSettings;
  hijriAdjustment?: number;
  onOpenHajjGuide?: () => void;
}

type CountdownTargetType = 'hajj_start' | 'arafah' | 'dhul_hijjah_start';

interface HajjMilestoneDate {
  hijriDay: number;
  hijriMonthIndex: number;
  hijriYear: number;
  hijriLabelBn: string;
  titleBn: string;
  arabicTitle: string;
  locationBn: string;
  summaryBn: string;
  ritualsBn: string[];
  gregorianDate: Date;
  gregorianFormattedBn: string;
  daysFromNow: number;
}

interface PrepItem {
  id: string;
  titleBn: string;
  subtitleBn: string;
  categoryBn: string;
}

const HAJJ_PREP_ITEMS: PrepItem[] = [
  {
    id: 'talbiyah_memorize',
    titleBn: 'তালবিয়া সহিহভাবে মুখস্থ ও অর্থ অনুধাবন',
    subtitleBn: '“লাব্বাইক আল্লাহুম্মা লাব্বাইক...” বেশি বেশি পাঠের অভ্যাস করা',
    categoryBn: 'দোয়া ও জিকির'
  },
  {
    id: 'ihram_rules',
    titleBn: 'ইহরামের ফরজ, ওয়াজিব ও নিষিদ্ধ কাজসমূহ জানা',
    subtitleBn: 'মিকাত অতিক্রমের পূর্বে ইহরাম বাঁধার নিয়ম ও সতর্কতা অধ্যয়ন',
    categoryBn: 'মাসআলা ও আহকাম'
  },
  {
    id: 'dhul_hijjah_first_nine',
    titleBn: 'জিলহজ্জের প্রথম ৯ দিনের নফল রোজা ও আমলের পরিকল্পনা',
    subtitleBn: 'বিশেষ করে ৯ জিলহজ্জ পবিত্র আরাফার দিনের রোজা রাখার নিয়ত',
    categoryBn: 'সুন্নাহ আমল'
  },
  {
    id: 'takbeer_tashreeq',
    titleBn: 'তাকবিরে তাশরিক মুখস্থ ও ওয়াজিব সময়ের হিসাব রাখা',
    subtitleBn: '৯ জিলহজ্জ ফজর থেকে ১৩ জিলহজ্জ আসর পর্যন্ত প্রত্যেক ফরজ সালাতের পর পাঠ',
    categoryBn: 'ওয়াজিব আমল'
  },
  {
    id: 'manasik_roadmap',
    titleBn: 'মিনা, আরাফাত, মুযদালিফা ও তাওয়াফে ইফাদাহর ধারাবাহিক নিয়ম জানা',
    subtitleBn: '৮ থেকে ১৩ জিলহজ্জের ৬ দিনের মানাসিক ধাপে ধাপে রিভিশন দেওয়া',
    categoryBn: 'হজের রুকন'
  }
];

const PREP_STORAGE_KEY = 'waqto_hajj_prep_checklist_v1';

export const HajjCountdownView: React.FC<HajjCountdownViewProps> = ({
  settings,
  hijriAdjustment,
  onOpenHajjGuide
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedTarget, setSelectedTarget] = useState<CountdownTargetType>('hajj_start');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(PREP_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const activeHijriAdj =
    typeof hijriAdjustment === 'number' ? hijriAdjustment : settings.hijriDayAdjustment || 0;

  // Live 1-second timer for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentHijri = useMemo(() => {
    return getHijriDate(now, activeHijriAdj);
  }, [now.toDateString(), activeHijriAdj]);

  // Compute the upcoming Hajj season dates based on the Hijri calendar
  const hajjSeasonData = useMemo(() => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // Determine if we are currently inside Hajj days (8-13 Dhul-Hijjah)
    const isCurrentlyHajjDays =
      currentHijri.monthIndex === 11 && currentHijri.day >= 8 && currentHijri.day <= 13;

    // Scan forward up to 400 days to locate the next occurrence of:
    // - 1 Shawwal (monthIndex 9, day 1)
    // - 1 Dhul-Hijjah (monthIndex 11, day 1)
    // - 8 Dhul-Hijjah (monthIndex 11, day 8) - Official Hajj Start (Yawm al-Tarwiyah)
    // - 9 Dhul-Hijjah (monthIndex 11, day 9) - Yawm Arafah
    // - 10 Dhul-Hijjah (monthIndex 11, day 10) - Yawm al-Nahr / Eid ul-Adha
    // - 11, 12, 13 Dhul-Hijjah (Ayyam al-Tashreeq)
    let dhulHijjah1Date: Date | null = null;
    let dhulHijjah8Date: Date | null = null;
    let dhulHijjah9Date: Date | null = null;
    let dhulHijjah10Date: Date | null = null;
    let dhulHijjah11Date: Date | null = null;
    let dhulHijjah12Date: Date | null = null;
    let dhulHijjah13Date: Date | null = null;
    let targetHijriYear = currentHijri.year;

    for (let offset = 0; offset <= 400; offset++) {
      const candidate = new Date(startOfToday.getTime() + offset * 24 * 60 * 60 * 1000);
      const h = getHijriDate(candidate, activeHijriAdj);

      if (h.monthIndex === 11) {
        if (h.day === 8 && !dhulHijjah8Date) {
          dhulHijjah8Date = candidate;
          targetHijriYear = h.year;
          dhulHijjah1Date = new Date(candidate.getTime() - 7 * 24 * 60 * 60 * 1000);
          dhulHijjah9Date = new Date(candidate.getTime() + 1 * 24 * 60 * 60 * 1000);
          dhulHijjah10Date = new Date(candidate.getTime() + 2 * 24 * 60 * 60 * 1000);
          dhulHijjah11Date = new Date(candidate.getTime() + 3 * 24 * 60 * 60 * 1000);
          dhulHijjah12Date = new Date(candidate.getTime() + 4 * 24 * 60 * 60 * 1000);
          dhulHijjah13Date = new Date(candidate.getTime() + 5 * 24 * 60 * 60 * 1000);
          break;
        }
      }
    }

    const fallbackBase = new Date(startOfToday.getTime() + 60 * 24 * 60 * 60 * 1000);
    const d1 = dhulHijjah1Date || fallbackBase;
    const d8 = dhulHijjah8Date || new Date(d1.getTime() + 7 * 24 * 60 * 60 * 1000);
    const d9 = dhulHijjah9Date || new Date(d8.getTime() + 1 * 24 * 60 * 60 * 1000);
    const d10 = dhulHijjah10Date || new Date(d8.getTime() + 2 * 24 * 60 * 60 * 1000);
    const d11 = dhulHijjah11Date || new Date(d8.getTime() + 3 * 24 * 60 * 60 * 1000);
    const d12 = dhulHijjah12Date || new Date(d8.getTime() + 4 * 24 * 60 * 60 * 1000);
    const d13 = dhulHijjah13Date || new Date(d8.getTime() + 5 * 24 * 60 * 60 * 1000);

    const calcDaysFromNow = (target: Date) =>
      Math.max(0, Math.ceil((target.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000)));

    const milestones: HajjMilestoneDate[] = [
      {
        hijriDay: 1,
        hijriMonthIndex: 11,
        hijriYear: targetHijriYear,
        hijriLabelBn: `১ জিলহজ্জ, ${toBengaliDigits(targetHijriYear)} হিজরি`,
        titleBn: 'জিলহজ্জের প্রথম দশক শুরু',
        arabicTitle: 'عشر ذي الحجة',
        locationBn: 'সর্বত্র (বিশেষ নফল ইবাদত)',
        summaryBn: 'বছরের শ্রেষ্ঠ ১০ দিনের সূচনা; নেক আমল, নফল সিয়াম, জিকির ও তাকবির পাঠের বিশেষ মৌসুম।',
        ritualsBn: [
          '১ থেকে ৯ জিলহজ্জ নফল রোজা রাখা ও বেশি বেশি তওবা-ইস্তিগফার করা',
          'কুরবানিদাতাদের জন্য চুল ও নখ না কাটার সুন্নাহ পালন শুরু'
        ],
        gregorianDate: d1,
        gregorianFormattedBn: formatBengaliDate(d1),
        daysFromNow: calcDaysFromNow(d1)
      },
      {
        hijriDay: 8,
        hijriMonthIndex: 11,
        hijriYear: targetHijriYear,
        hijriLabelBn: `৮ জিলহজ্জ, ${toBengaliDigits(targetHijriYear)} হিজরি`,
        titleBn: 'ইয়াওমুত তারউইয়াহ (হজের ১ম দিন)',
        arabicTitle: 'يوم التروية',
        locationBn: 'মক্কা ও মিনা',
        summaryBn: 'হজের আনুষ্ঠানিক কার্যক্রম শুরু। হাজীগণ ইহরাম বেঁধে তালবিয়া পাঠ করতে করতে মিনায় গমন ও অবস্থান করেন।',
        ritualsBn: [
          'হজের নিয়তে ইহরাম বাঁধা ও তালবিয়া পাঠ',
          'মিনায় যোহর, আসর, মাগরিব, এশা ও ৯ তারিখের ফজর আদায় এবং রাত্রিযাপন'
        ],
        gregorianDate: d8,
        gregorianFormattedBn: formatBengaliDate(d8),
        daysFromNow: calcDaysFromNow(d8)
      },
      {
        hijriDay: 9,
        hijriMonthIndex: 11,
        hijriYear: targetHijriYear,
        hijriLabelBn: `৯ জিলহজ্জ, ${toBengaliDigits(targetHijriYear)} হিজরি`,
        titleBn: 'ইয়াওমু আরাফাহ — পবিত্র হজের মূল দিন',
        arabicTitle: 'يوم عرفة',
        locationBn: 'আরাফাতের ময়দান ও মুযদালিফা',
        summaryBn: '“আল-হজ্জু আরাফাহ” — আরাফাতের ময়দানে অবস্থান করাই হজের সবচেয়ে বড় ফরজ রুকন। গায়রে হাজীদের জন্য এ দিনের রোজা ২ বছরের গুনাহ মাফের মাধ্যম।',
        ritualsBn: [
          'সূর্যোদয়ের পর মিনা থেকে আরাফাতের ময়দানে গমন এবং সূর্যাস্ত পর্যন্ত উকুফে আরাফাহ',
          'সূর্যাস্তের পর মুযদালিফায় গমন, মাগরিব ও এশা একত্রে আদায় এবং কংকর সংগ্রহ'
        ],
        gregorianDate: d9,
        gregorianFormattedBn: formatBengaliDate(d9),
        daysFromNow: calcDaysFromNow(d9)
      },
      {
        hijriDay: 10,
        hijriMonthIndex: 11,
        hijriYear: targetHijriYear,
        hijriLabelBn: `১০ জিলহজ্জ, ${toBengaliDigits(targetHijriYear)} হিজরি`,
        titleBn: 'ইয়াওমুন নাহর ও ঈদুল আযহা (হজের ৩য় দিন)',
        arabicTitle: 'يوم النحر',
        locationBn: 'মিনা ও মাসজিদুল হারাম',
        summaryBn: 'হজের সর্বাধিক ব্যস্ত ও গুরুত্বপূর্ণ দিন: বড় জামারাতে কংকর নিক্ষেপ, কুরবানি, মাথার চুল মুণ্ডন এবং তাওয়াফে জিয়ারত।',
        ritualsBn: [
          'জামারায়ে আকাবায় (বড় শয়তানকে) ৭টি কংকর নিক্ষেপ করা',
          'হাদি (পশু) কুরবানি করা এবং মাথা মুণ্ডন (হলক) বা চুল ছোট করে ইহরাম খোলা',
          'মক্কায় গিয়ে ফরজ তাওয়াফে ইফাদাহ (তাওয়াফে জিয়ারত) ও সাঈ সম্পন্ন করা'
        ],
        gregorianDate: d10,
        gregorianFormattedBn: formatBengaliDate(d10),
        daysFromNow: calcDaysFromNow(d10)
      },
      {
        hijriDay: 11,
        hijriMonthIndex: 11,
        hijriYear: targetHijriYear,
        hijriLabelBn: `১১–১৩ জিলহজ্জ, ${toBengaliDigits(targetHijriYear)} হিজরি`,
        titleBn: 'আইয়ামে তাশরিক ও বিদায়ী তাওয়াফ',
        arabicTitle: 'أيام التشريق',
        locationBn: 'মিনা ও কাবা শরিফ',
        summaryBn: 'মিনায় রাত্রিযাপন, প্রতিদিন দুপুরে সূর্য ঢলে পড়ার পর তিনটি জামারাতে ৭টি করে মোট ২১টি কংকর নিক্ষেপ এবং মক্কা ত্যাগের পূর্বে বিদায়ী তাওয়াফ।',
        ritualsBn: [
          '১১, ১২ ও ১৩ জিলহজ্জ দুপুরে ছোট, মধ্যম ও বড় জামারাতে কংকর নিক্ষেপ',
          'মক্কা ত্যাগের পূর্বে বাইতুল্লাহর বিদায়ী তাওয়াফ (তাওয়াফুল বিদা) আদায়'
        ],
        gregorianDate: d11,
        gregorianFormattedBn: `${formatBengaliDate(d11)} থেকে ${formatBengaliDate(d13)}`,
        daysFromNow: calcDaysFromNow(d11)
      }
    ];

    return {
      isCurrentlyHajjDays,
      targetHijriYear,
      dhulHijjah1Date: d1,
      dhulHijjah8Date: d8,
      dhulHijjah9Date: d9,
      milestones
    };
  }, [now.toDateString(), activeHijriAdj, currentHijri.monthIndex, currentHijri.day, currentHijri.year]);

  // Active target Date based on user selection
  const activeTargetInfo = useMemo(() => {
    if (selectedTarget === 'arafah') {
      return {
        targetDate: hajjSeasonData.dhulHijjah9Date,
        labelBn: `পবিত্র আরাফার দিন (৯ জিলহজ্জ, ${toBengaliDigits(hajjSeasonData.targetHijriYear)} হিজরি)`,
        shortTitleBn: 'ইয়াওমু আরাফাহ কাউন্টডাউন'
      };
    }
    if (selectedTarget === 'dhul_hijjah_start') {
      return {
        targetDate: hajjSeasonData.dhulHijjah1Date,
        labelBn: `জিলহজ্জ মাস শুরু (১ জিলহজ্জ, ${toBengaliDigits(hajjSeasonData.targetHijriYear)} হিজরি)`,
        shortTitleBn: 'জিলহজ্জের প্রথম দশক কাউন্টডাউন'
      };
    }
    return {
      targetDate: hajjSeasonData.dhulHijjah8Date,
      labelBn: `পবিত্র হজ শুরু (৮ জিলহজ্জ, ${toBengaliDigits(hajjSeasonData.targetHijriYear)} হিজরি)`,
      shortTitleBn: 'পবিত্র হজ মৌসুম কাউন্টডাউন'
    };
  }, [selectedTarget, hajjSeasonData]);

  // Calculate live Days, Hours, Minutes, Seconds remaining
  const diffMs = Math.max(0, activeTargetInfo.targetDate.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const daysLeft = Math.floor(totalSeconds / (3600 * 24));
  const hoursLeft = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutesLeft = Math.floor((totalSeconds % 3600) / 60);
  const secondsLeft = totalSeconds % 60;

  // Hijri year progress percentage toward Hajj (out of 354 days)
  const yearProgressPercent = useMemo(() => {
    const clamped = Math.min(354, Math.max(0, 354 - daysLeft));
    return Math.round((clamped / 354) * 100);
  }, [daysLeft]);

  const handleTogglePrepItem = (id: string) => {
    triggerHaptic(20);
    const updated = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(updated);
    try {
      localStorage.setItem(PREP_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const completedPrepCount = HAJJ_PREP_ITEMS.filter((item) => !!checkedItems[item.id]).length;

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Primary Focal Anchor: Live Hajj Season Countdown Hero Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0b3b29] text-white p-5 sm:p-6 shadow-lg border border-emerald-500/25 space-y-4">
        {/* Subtle architectural motif rings */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-20 -top-20 w-64 h-64 rounded-full border border-white/10"
          aria-hidden="true"
        />

        {/* Top metadata line (clean unboxed text with separators) */}
        <div className="relative z-10 flex items-center justify-between text-xs text-emerald-100">
          <div className="flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>আজ: {currentHijri.formattedBn}</span>
          </div>
          <span className="font-mono tabular-nums text-amber-300 font-semibold">
            হজ {toBengaliDigits(hajjSeasonData.targetHijriYear)} হিজরি
          </span>
        </div>

        {/* Title & Target Date */}
        <div className="relative z-10 space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
            {activeTargetInfo.shortTitleBn}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium">
            {activeTargetInfo.labelBn} · {formatBengaliDate(activeTargetInfo.targetDate)}
          </p>
        </div>

        {/* Target Switcher Segmented Control */}
        <div className="relative z-10 grid grid-cols-3 gap-1 p-1 rounded-xl bg-emerald-950/60 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setSelectedTarget('hajj_start');
            }}
            className={`py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
              selectedTarget === 'hajj_start'
                ? 'bg-amber-400 text-stone-950 shadow-xs'
                : 'text-emerald-100 hover:text-white'
            }`}
          >
            ৮ জিলহজ্জ (হজ শুরু)
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setSelectedTarget('arafah');
            }}
            className={`py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
              selectedTarget === 'arafah'
                ? 'bg-amber-400 text-stone-950 shadow-xs'
                : 'text-emerald-100 hover:text-white'
            }`}
          >
            ৯ জিলহজ্জ (আরাফা)
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setSelectedTarget('dhul_hijjah_start');
            }}
            className={`py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
              selectedTarget === 'dhul_hijjah_start'
                ? 'bg-amber-400 text-stone-950 shadow-xs'
                : 'text-emerald-100 hover:text-white'
            }`}
          >
            ১ জিলহজ্জ (দশক)
          </button>
        </div>

        {/* 4-Column Live Tabular Countdown Display */}
        <div className="relative z-10 grid grid-cols-4 gap-2.5 text-center pt-1">
          <div className="rounded-2xl bg-emerald-950/65 border border-white/15 py-3 px-2">
            <span className="block text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-300 leading-none">
              {toBengaliDigits(daysLeft)}
            </span>
            <span className="block text-[11px] text-emerald-100 font-semibold mt-1.5">
              দিন
            </span>
          </div>

          <div className="rounded-2xl bg-emerald-950/65 border border-white/15 py-3 px-2">
            <span className="block text-2xl sm:text-3xl font-black font-mono tabular-nums text-white leading-none">
              {toBengaliDigits(String(hoursLeft).padStart(2, '0'))}
            </span>
            <span className="block text-[11px] text-emerald-100 font-semibold mt-1.5">
              ঘণ্টা
            </span>
          </div>

          <div className="rounded-2xl bg-emerald-950/65 border border-white/15 py-3 px-2">
            <span className="block text-2xl sm:text-3xl font-black font-mono tabular-nums text-white leading-none">
              {toBengaliDigits(String(minutesLeft).padStart(2, '0'))}
            </span>
            <span className="block text-[11px] text-emerald-100 font-semibold mt-1.5">
              মিনিট
            </span>
          </div>

          <div className="rounded-2xl bg-emerald-950/65 border border-white/15 py-3 px-2">
            <span className="block text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-200 leading-none">
              {toBengaliDigits(String(secondsLeft).padStart(2, '0'))}
            </span>
            <span className="block text-[11px] text-emerald-100 font-semibold mt-1.5">
              সেকেন্ড
            </span>
          </div>
        </div>

        {/* Hijri Year Progress toward Hajj */}
        <div className="relative z-10 space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-emerald-100">
            <span>হিজরি বর্ষের অগ্রগতি (হজের প্রতীক্ষা)</span>
            <span className="font-mono tabular-nums font-bold text-amber-300">
              {toBengaliDigits(yearProgressPercent)}%
            </span>
          </div>
          <div className="h-2 w-full bg-emerald-950/75 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-300 via-amber-300 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, yearProgressPercent)}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. Talbiyah Spotlight Card */}
      <section className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
            হজের তালবিয়া (التلبية)
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            সহিহ বুখারি: ১৫৪৯
          </span>
        </div>

        <p className="font-arabic text-right text-xl sm:text-2xl text-stone-900 dark:text-stone-50 leading-loose">
          لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ
        </p>

        <p className="text-xs sm:text-sm text-[#177a56] dark:text-emerald-400 font-semibold leading-relaxed">
          উচ্চারণ: লাব্বাইক আল্লাহুম্মা লাব্বাইক, লাব্বাইকা লা শারিকা লাকা লাব্বাইক, ইন্নাল হামদা ওয়ান-নি’মাতা লাকা ওয়াল-মুলক, লা শারিকা লাক।
        </p>

        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
          অর্থ: “আমি হাজির হে আল্লাহ! আমি হাজির। আপনার কোনো শরিক নেই, আমি হাজির। নিশ্চয়ই সকল প্রশংসা, নিয়ামত এবং রাজত্ব আপনারই; আপনার কোনো শরিক নেই।”
        </p>
      </section>

      {/* 3. Hajj Season Day-by-Day Hijri Calendar Roadmap */}
      <section className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              আসন্ন হজ মৌসুমের দিনভিত্তিক ক্যালেন্ডার ({toBengaliDigits(hajjSeasonData.targetHijriYear)} হিজরি)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              হিজরি হিসাব অনুযায়ী জিলহজ্জ মাসের প্রধান দিনসমূহ ও সম্ভাব্য গ্রেগরিয়ান তারিখ
            </p>
          </div>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
          {hajjSeasonData.milestones.map((m, idx) => (
            <div key={m.hijriDay} className="py-3.5 first:pt-1 last:pb-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#177a56] dark:text-emerald-400 font-bold">
                    <span>০{toBengaliDigits(idx + 1)}.</span>
                    <span>{m.hijriLabelBn}</span>
                    <span aria-hidden="true">·</span>
                    <span>{m.locationBn}</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
                    {m.titleBn}
                  </h4>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100 block">
                    {m.daysFromNow === 0
                      ? 'আজ'
                      : `${toBengaliDigits(m.daysFromNow)} দিন বাকি`}
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                    {m.gregorianFormattedBn}
                  </span>
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                {m.summaryBn}
              </p>

              <ul className="space-y-1 pt-0.5">
                {m.ritualsBn.map((ritual, rIdx) => (
                  <li
                    key={rIdx}
                    className="text-xs text-stone-700 dark:text-stone-300 flex items-start gap-2"
                  >
                    <span className="text-[#177a56] dark:text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{ritual}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Interactive Hajj & Dhul-Hijjah Preparation Checklist */}
      <section className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              হজ ও জিলহজ্জের পূর্বপ্রস্তুতি চেকলিস্ট
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              হজযাত্রী ও সাধারণ মুসলিমদের জন্য জিলহজ্জ মাসের আমল প্রস্তুতি
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums font-bold text-[#177a56] dark:text-emerald-400">
            {toBengaliDigits(completedPrepCount)}/{toBengaliDigits(HAJJ_PREP_ITEMS.length)} সম্পন্ন
          </span>
        </div>

        <div className="space-y-2">
          {HAJJ_PREP_ITEMS.map((item) => {
            const isChecked = !!checkedItems[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTogglePrepItem(item.id)}
                className={`w-full p-3 rounded-xl border text-left flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-[#177a56]/50 text-stone-900 dark:text-stone-100'
                    : 'bg-stone-50/70 dark:bg-stone-900/50 border-stone-200/80 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isChecked
                        ? 'bg-[#177a56] text-white'
                        : 'border-2 border-stone-300 dark:border-stone-700'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block leading-snug">
                      {item.titleBn}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                      {item.subtitleBn} · {item.categoryBn}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Link to Detailed Step-by-Step Hajj & Umrah Guide */}
        {onOpenHajjGuide && (
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                onOpenHajjGuide();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#177a56] hover:bg-[#126446] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>হজ ও উমরাহর ধাপে ধাপে পূর্ণাঙ্গ গাইড দেখুন</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
