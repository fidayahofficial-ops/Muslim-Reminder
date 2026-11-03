import { SunnahFastingAlertsToggles } from '../types';
import { getHijriDate, formatBengaliDate, toBengaliDigits } from './prayerTimes';

export interface SunnahFastingCategoryMeta {
  key: keyof SunnahFastingAlertsToggles;
  nameBn: string;
  hijriRuleBn: string;
  virtueBn: string;
  hadithRef: string;
}

export const DEFAULT_SUNNAH_FASTING_TOGGLES: SunnahFastingAlertsToggles = {
  mondayThursday: true,
  ayyamAlBeed: true,
  arafah: true,
  ashura: true,
  shawwalSix: true,
  shaban: true
};

export const SUNNAH_FASTING_CATEGORIES: SunnahFastingCategoryMeta[] = [
  {
    key: 'mondayThursday',
    nameBn: 'সোমবার ও বৃহস্পতিবারের সাপ্তাহিক রোজা',
    hijriRuleBn: 'প্রতি সপ্তাহের সোমবার ও বৃহস্পতিবার',
    virtueBn: 'সোমবার ও বৃহস্পতিবার বান্দার আমলসমূহ আল্লাহর দরবারে পেশ করা হয়।',
    hadithRef: 'সুনানে তিরমিজি: ৭৪৭'
  },
  {
    key: 'ayyamAlBeed',
    nameBn: 'আইয়ামে বীজের রোজা (১৩, ১৪ ও ১৫ হিজরি)',
    hijriRuleBn: 'প্রতি হিজরি মাসের ১৩, ১৪ ও ১৫ তারিখ',
    virtueBn: 'প্রতি মাসে তিনটি রোজা রাখা সারা বছর রোজা রাখার সমতুল্য।',
    hadithRef: 'সহিহ বুখারি: ১৯৮১'
  },
  {
    key: 'arafah',
    nameBn: 'আরাফার দিনের রোজা (৯ জিলহজ্জ)',
    hijriRuleBn: '৯ জিলহজ্জ • বাৎসরিক সুন্নাহ',
    virtueBn: 'আরাফার দিনের রোজা পূর্ববর্তী ও পরবর্তী এক বছরের গুনাহ মোচন করে।',
    hadithRef: 'সহিহ মুসলিম: ১১৬২'
  },
  {
    key: 'ashura',
    nameBn: 'আশুরা ও তাসুয়ার রোজা (৯ ও ১০ মুহাররম)',
    hijriRuleBn: '৯ ও ১০ মুহাররম • বাৎসরিক সুন্নাহ',
    virtueBn: 'আশুরার দিনের রোজা পূর্ববর্তী এক বছরের গুনাহ মোচন করে।',
    hadithRef: 'সহিহ মুসলিম: ১১৬২'
  },
  {
    key: 'shawwalSix',
    nameBn: 'শাওয়াল মাসের ৬ রোজা',
    hijriRuleBn: '২ থেকে ৭ শাওয়াল • ঈদুল ফিতরের পর',
    virtueBn: 'রমজানের পর শাওয়ালের ৬ রোজা রাখলে পূর্ণ এক বছর সিয়াম পালনের সওয়াব পাওয়া যায়।',
    hadithRef: 'সহিহ মুসলিম: ১১৬৪'
  },
  {
    key: 'shaban',
    nameBn: 'শাবান মাসের সুন্নাহ রোজা',
    hijriRuleBn: '১৪ ও ১৫ শাবান • শাবান মাসের নফল সিয়াম',
    virtueBn: 'রাসূলুল্লাহ (সা.) রমজান ব্যতীত শাবান মাসেই সবচেয়ে বেশি নফল রোজা রাখতেন।',
    hadithRef: 'সহিহ বুখারি: ১৯৬৯'
  }
];

export interface SunnahFastingDayMatch {
  date: Date;
  dateKey: string;
  gregorianDateBn: string;
  hijriDateBn: string;
  hijriDay: number;
  hijriMonthBn: string;
  matchedKeys: Array<keyof SunnahFastingAlertsToggles>;
  primaryTitleBn: string;
  virtueBn: string;
  hadithRef: string;
  daysFromNow: number;
}

/**
 * Evaluates whether a given Gregorian date corresponds to one or more enabled
 * Sunnah Fasting days according to the Hijri & weekly calendar.
 * Automatically excludes prohibited fasting days (Eid ul-Fitr 1 Shawwal,
 * Eid ul-Adha 10 Dhul-Hijjah, and Ayyam al-Tashreeq 11-13 Dhul-Hijjah) and Ramadan.
 */
export function evaluateSunnahFastingDay(
  date: Date,
  hijriAdjustment: number = 0,
  toggles: SunnahFastingAlertsToggles = DEFAULT_SUNNAH_FASTING_TOGGLES,
  daysFromNow: number = 0
): SunnahFastingDayMatch | null {
  const hijri = getHijriDate(date, hijriAdjustment);
  const hMonth = hijri.monthIndex; // 0 = Muharram, ..., 7 = Shaban, 8 = Ramadan, 9 = Shawwal, 10 = Dhul-Qadah, 11 = Dhul-Hijjah
  const hDay = hijri.day;
  const weekDay = date.getDay(); // 0 = Sun, 1 = Mon, ..., 4 = Thu

  // 1. Exclude Ramadan (monthIndex === 8) as Farz fasting is already obligatory
  if (hMonth === 8) {
    return null;
  }

  // 2. Exclude Forbidden Fasting Days in Islamic Jurisprudence:
  // - 1 Shawwal (Eid ul-Fitr)
  if (hMonth === 9 && hDay === 1) {
    return null;
  }
  // - 10, 11, 12, 13 Dhul-Hijjah (Eid ul-Adha and Ayyam al-Tashreeq)
  if (hMonth === 11 && hDay >= 10 && hDay <= 13) {
    return null;
  }

  const matchedKeys: Array<keyof SunnahFastingAlertsToggles> = [];
  const titles: string[] = [];
  let primaryVirtue = '';
  let primaryRef = '';

  // Priority 1: Arafah (9 Dhul-Hijjah)
  if (toggles.arafah && hMonth === 11 && hDay === 9) {
    matchedKeys.push('arafah');
    titles.push('আরাফার দিনের রোজা (৯ জিলহজ্জ)');
    primaryVirtue = 'আরাফার দিনের রোজা পূর্ববর্তী ও পরবর্তী এক বছরের গুনাহ মোচন করে।';
    primaryRef = 'সহিহ মুসলিম: ১১৬২';
  }

  // Priority 2: Ashura & Tasu'a (9 & 10 Muharram)
  if (toggles.ashura && hMonth === 0 && (hDay === 9 || hDay === 10)) {
    matchedKeys.push('ashura');
    titles.push(hDay === 9 ? 'তাসুয়ার রোজা (৯ মুহাররম)' : 'পবিত্র আশুরার রোজা (১০ মুহাররম)');
    if (!primaryVirtue) {
      primaryVirtue = 'আশুরার দিনের রোজা পূর্ববর্তী এক বছরের গুনাহ মোচন করে।';
      primaryRef = 'সহিহ মুসলিম: ১১৬২';
    }
  }

  // Priority 3: Shawwal 6 Fasts (2 - 7 Shawwal)
  if (toggles.shawwalSix && hMonth === 9 && hDay >= 2 && hDay <= 7) {
    matchedKeys.push('shawwalSix');
    titles.push(`শাওয়ালের ৬ রোজা (${toBengaliDigits(hDay - 1)}তম দিন)`);
    if (!primaryVirtue) {
      primaryVirtue = 'রমজানের পর শাওয়ালের ৬ রোজা রাখলে সারা বছর রোজা রাখার সওয়াব পাওয়া যায়।';
      primaryRef = 'সহিহ মুসলিম: ১১৬৪';
    }
  }

  // Priority 4: Ayyam al-Beed (13, 14, 15 of every Hijri month)
  if (toggles.ayyamAlBeed && (hDay === 13 || hDay === 14 || hDay === 15)) {
    matchedKeys.push('ayyamAlBeed');
    titles.push(`আইয়ামে বীজের রোজা (${toBengaliDigits(hDay)} ${hijri.monthNameBn})`);
    if (!primaryVirtue) {
      primaryVirtue = 'প্রতি মাসে তিন দিন (১৩, ১৪ ও ১৫ তারিখ) রোজা রাখা সারা বছর রোজা রাখার সমতুল্য।';
      primaryRef = 'সহিহ বুখারি: ১৯৮১';
    }
  }

  // Priority 5: Sha'ban Mid-month Sunnah Fasting (14 & 15 Sha'ban)
  if (toggles.shaban && hMonth === 7 && (hDay === 14 || hDay === 15)) {
    matchedKeys.push('shaban');
    if (!matchedKeys.includes('ayyamAlBeed')) {
      titles.push(`শাবান মাসের সুন্নাহ রোজা (${toBengaliDigits(hDay)} শাবান)`);
    }
    if (!primaryVirtue) {
      primaryVirtue = 'রাসূলুল্লাহ (সা.) রমজান ব্যতীত শাবান মাসেই সবচেয়ে বেশি নফল রোজা রাখতেন।';
      primaryRef = 'সহিহ বুখারি: ১৯৬৯';
    }
  }

  // Priority 6: Monday & Thursday Weekly Sunnah Fasting
  if (toggles.mondayThursday && (weekDay === 1 || weekDay === 4)) {
    matchedKeys.push('mondayThursday');
    const dayNameBn = weekDay === 1 ? 'সোমবারের' : 'বৃহস্পতিবারের';
    titles.push(`${dayNameBn} সাপ্তাহিক সুন্নাহ রোজা`);
    if (!primaryVirtue) {
      primaryVirtue = 'সোমবার ও বৃহস্পতিবার বান্দার আমল আল্লাহর দরবারে পেশ করা হয়।';
      primaryRef = 'সুনানে তিরমিজি: ৭৪৭';
    }
  }

  if (matchedKeys.length === 0) {
    return null;
  }

  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    date,
    dateKey,
    gregorianDateBn: formatBengaliDate(date),
    hijriDateBn: hijri.formattedBn,
    hijriDay: hDay,
    hijriMonthBn: hijri.monthNameBn,
    matchedKeys,
    primaryTitleBn: titles.slice(0, 2).join(' ও '),
    virtueBn: primaryVirtue,
    hadithRef: primaryRef,
    daysFromNow
  };
}

/**
 * Returns the upcoming Sunnah Fasting days within the next 90 days based on active toggles.
 */
export function getUpcomingSunnahFastingDays(
  baseDate: Date = new Date(),
  hijriAdjustment: number = 0,
  toggles: SunnahFastingAlertsToggles = DEFAULT_SUNNAH_FASTING_TOGGLES,
  limit: number = 4
): SunnahFastingDayMatch[] {
  const results: SunnahFastingDayMatch[] = [];
  const startOfDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0);

  for (let offset = 0; offset <= 90 && results.length < limit; offset++) {
    const targetDate = new Date(startOfDay.getTime() + offset * 24 * 60 * 60 * 1000);
    const match = evaluateSunnahFastingDay(targetDate, hijriAdjustment, toggles, offset);
    if (match) {
      results.push(match);
    }
  }

  return results;
}

const GREGORIAN_MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export interface AyyamAlBeedWindowInfo {
  titleBn: string;
  messageBn: string;
  hijriMonthBn: string;
  hijriYearBn: string;
  dates: Date[];
  dateNumbersBn: string[];
  gregorianMonthBn: string;
  daysUntilStart: number;
  isOngoingToday: boolean;
  hadithVirtueBn: string;
  hadithRefBn: string;
}

/**
 * Computes the current or next upcoming 3-day Ayyam al-Beed (13, 14, 15 Hijri) fasting window
 * and formats the conversational Bengali reminder message:
 * e.g. "আগামী ২, ৩, ও ৪ ফেব্রুয়ারি আইয়ামে বীজের রোজা। প্রস্তুতি রাখছেন তো?"
 */
export function getUpcomingAyyamAlBeedWindow(
  baseDate: Date = new Date(),
  hijriAdjustment: number = 0
): AyyamAlBeedWindowInfo {
  const startOfDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0);
  const matchedDates: Array<{ date: Date; offset: number; hijriDay: number; hijriMonthBn: string; hijriYear: number; monthIndex: number }> = [];

  // Look ahead up to 45 days to find the next (or currently active) 13, 14, 15 Hijri cluster
  let targetMonthIdx: number | null = null;
  let targetYear: number | null = null;

  // Also check 2 days back in case today is 14th or 15th Hijri so we still group 13, 14, 15 together
  for (let offset = -2; offset <= 40; offset++) {
    const d = new Date(startOfDay.getTime() + offset * 24 * 60 * 60 * 1000);
    const h = getHijriDate(d, hijriAdjustment);

    // Skip Ramadan (monthIndex 8) and 13 Dhul-Hijjah (Tashreeq) if needed, though in Dhul-Hijjah 14,15 are fasted
    if (h.monthIndex === 8) continue;

    if (h.day === 13 || h.day === 14 || h.day === 15) {
      if (targetMonthIdx === null) {
        // Only lock onto this month's cluster if at least one day of it is today or in the future
        const clusterEndCheck = offset + (15 - h.day);
        if (clusterEndCheck >= 0) {
          targetMonthIdx = h.monthIndex;
          targetYear = h.year;
        }
      }

      if (targetMonthIdx !== null && h.monthIndex === targetMonthIdx && h.year === targetYear) {
        // Avoid duplicate hijriDay if astronomical rounding repeats a day
        if (!matchedDates.some((m) => m.hijriDay === h.day)) {
          matchedDates.push({
            date: d,
            offset,
            hijriDay: h.day,
            hijriMonthBn: h.monthNameBn,
            hijriYear: h.year,
            monthIndex: h.monthIndex
          });
        }
      }
    }
  }

  // Fallback if cluster had fewer than 3 days due to month jump
  if (matchedDates.length === 0) {
    for (let i = 1; i <= 3; i++) {
      const d = new Date(startOfDay.getTime() + i * 24 * 60 * 60 * 1000);
      const h = getHijriDate(d, hijriAdjustment);
      matchedDates.push({
        date: d,
        offset: i,
        hijriDay: 12 + i,
        hijriMonthBn: h.monthNameBn,
        hijriYear: h.year,
        monthIndex: h.monthIndex
      });
    }
  } else if (matchedDates.length < 3) {
    // Ensure exactly 3 consecutive Gregorian dates for 13, 14, 15
    const first = matchedDates[0];
    const startOffset = first.offset - (first.hijriDay - 13);
    matchedDates.length = 0;
    for (let i = 0; i < 3; i++) {
      const off = startOffset + i;
      const d = new Date(startOfDay.getTime() + off * 24 * 60 * 60 * 1000);
      matchedDates.push({
        date: d,
        offset: off,
        hijriDay: 13 + i,
        hijriMonthBn: first.hijriMonthBn,
        hijriYear: first.hijriYear,
        monthIndex: first.monthIndex
      });
    }
  }

  const dates = matchedDates.map((m) => m.date);
  const dayNumsBn = dates.map((d) => toBengaliDigits(d.getDate()));
  const firstMonth = dates[0].getMonth();
  const lastMonth = dates[dates.length - 1].getMonth();
  const gregorianMonthBn =
    firstMonth === lastMonth
      ? GREGORIAN_MONTHS_BN[firstMonth]
      : `${GREGORIAN_MONTHS_BN[firstMonth]} ও ${GREGORIAN_MONTHS_BN[lastMonth]}`;

  const daysUntilStart = Math.max(0, matchedDates[0].offset);
  const isOngoingToday = matchedDates.some((m) => m.offset === 0);

  let dateListStr = '';
  if (dayNumsBn.length === 3) {
    dateListStr = `${dayNumsBn[0]}, ${dayNumsBn[1]}, ও ${dayNumsBn[2]} ${gregorianMonthBn}`;
  } else {
    dateListStr = `${dayNumsBn.join(', ')} ${gregorianMonthBn}`;
  }

  const messageBn = isOngoingToday
    ? `আজ আইয়ামে বীজের রোজা চলছে (${dateListStr})। প্রস্তুতি রাখছেন তো?`
    : `আগামী ${dateListStr} আইয়ামে বীজের রোজা। প্রস্তুতি রাখছেন তো?`;

  return {
    titleBn: 'আইয়ামে বীজের রোজা',
    messageBn,
    hijriMonthBn: matchedDates[0].hijriMonthBn,
    hijriYearBn: toBengaliDigits(matchedDates[0].hijriYear),
    dates,
    dateNumbersBn: dayNumsBn,
    gregorianMonthBn,
    daysUntilStart,
    isOngoingToday,
    hadithVirtueBn: 'রাসূলুল্লাহ (সা.) বলেছেন: “প্রতি মাসে তিন দিন (১৩, ১৪ ও ১৫ তারিখ) রোজা রাখা সারা বছর রোজা রাখার সমতুল্য।”',
    hadithRefBn: 'সহিহ বুখারি: ১৯৮১, সহিহ মুসলিম: ১১৫৯'
  };
}

export interface IslamicSpecialDayEvent {
  id: string;
  titleBn: string;
  notificationMessageBn: string;
  hijriDateLabelBn: string;
  gregorianDateLabelBn: string;
  daysRemaining: number;
  category: 'fasting' | 'night' | 'festival' | 'weekly';
  toggleKey?: keyof SunnahFastingAlertsToggles;
  virtueBn: string;
  hadithRefBn: string;
  isHighlighted?: boolean;
}

/**
 * Generates calendar-based reminders for upcoming Islamic special days & Sunnah fasts
 */
export function getUpcomingIslamicSpecialDays(
  baseDate: Date = new Date(),
  hijriAdjustment: number = 0
): IslamicSpecialDayEvent[] {
  const startOfDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0);
  const events: IslamicSpecialDayEvent[] = [];

  // 1. Always include the signature Ayyam al-Beed 3-day reminder card first
  const ayyam = getUpcomingAyyamAlBeedWindow(baseDate, hijriAdjustment);
  const ayyamGregorianLabel =
    ayyam.dateNumbersBn.length === 3
      ? `${ayyam.dateNumbersBn[0]}, ${ayyam.dateNumbersBn[1]}, ও ${ayyam.dateNumbersBn[2]} ${ayyam.gregorianMonthBn}`
      : `${ayyam.dateNumbersBn.join(', ')} ${ayyam.gregorianMonthBn}`;

  events.push({
    id: 'ayyam_al_beed_next',
    titleBn: 'আইয়ামে বীজের রোজা',
    notificationMessageBn: ayyam.messageBn,
    hijriDateLabelBn: `১৩, ১৪ ও ১৫ ${ayyam.hijriMonthBn}, ${ayyam.hijriYearBn} হিজরি`,
    gregorianDateLabelBn: ayyamGregorianLabel,
    daysRemaining: ayyam.daysUntilStart,
    category: 'fasting',
    toggleKey: 'ayyamAlBeed',
    virtueBn: ayyam.hadithVirtueBn,
    hadithRefBn: ayyam.hadithRefBn,
    isHighlighted: true
  });

  // 2. Next Monday or Thursday Sunnah Fast
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(startOfDay.getTime() + offset * 24 * 60 * 60 * 1000);
    const w = d.getDay();
    if (w === 1 || w === 4) {
      const h = getHijriDate(d, hijriAdjustment);
      if (h.monthIndex !== 8) {
        const dayNameBn = w === 1 ? 'সোমবার' : 'বৃহস্পতিবার';
        const dayNumBn = toBengaliDigits(d.getDate());
        const monthBn = GREGORIAN_MONTHS_BN[d.getMonth()];
        events.push({
          id: `mon_thu_${offset}`,
          titleBn: `${dayNameBn}ের সুন্নাহ রোজা`,
          notificationMessageBn:
            offset === 0
              ? `আজ ${dayNameBn} (${dayNumBn} ${monthBn}) সাপ্তাহিক সুন্নাহ রোজা। আল্লাহ আপনার আমল কবুল করুন।`
              : `আগামী ${dayNumBn} ${monthBn} (${dayNameBn}) সাপ্তাহিক সুন্নাহ রোজা। প্রস্তুতি রাখছেন তো?`,
          hijriDateLabelBn: h.formattedBn,
          gregorianDateLabelBn: `${dayNumBn} ${monthBn} (${dayNameBn})`,
          daysRemaining: offset,
          category: 'weekly',
          toggleKey: 'mondayThursday',
          virtueBn: 'সোমবার ও বৃহস্পতিবার বান্দার আমলসমূহ আল্লাহর দরবারে পেশ করা হয়।',
          hadithRefBn: 'সুনানে তিরমিজি: ৭৪৭'
        });
        break;
      }
    }
  }

  // 3. Scan the next 365 days for major Hijri calendar special days
  const ANNUAL_HIJRI_EVENTS: Array<{
    id: string;
    hMonth: number;
    hDay: number;
    titleBn: string;
    hijriLabelBn: string;
    category: 'fasting' | 'night' | 'festival';
    toggleKey?: keyof SunnahFastingAlertsToggles;
    virtueBn: string;
    hadithRefBn: string;
    buildMessage: (dateStrBn: string, isToday: boolean) => string;
  }> = [
    {
      id: 'muharram_ashura',
      hMonth: 0,
      hDay: 10,
      titleBn: 'পবিত্র আশুরা ও তাসুয়ার রোজা',
      hijriLabelBn: '৯ ও ১০ মুহাররম',
      category: 'fasting',
      toggleKey: 'ashura',
      virtueBn: 'আশুরার দিনের রোজা পূর্ববর্তী এক বছরের গুনাহ মোচন করে। (৯ ও ১০ অথবা ১০ ও ১১ মুহাররম দুটি রোজা রাখা সুন্নাহ)',
      hadithRefBn: 'সহিহ মুসলিম: ১১৬২',
      buildMessage: (dateStrBn, isToday) =>
        isToday
          ? `আজ পবিত্র আশুরার রোজা (${dateStrBn})। আল্লাহ আপনার সিয়াম কবুল করুন।`
          : `আগামী ${dateStrBn} পবিত্র আশুরা ও তাসুয়ার রোজা। প্রস্তুতি রাখছেন তো?`
    },
    {
      id: 'rabiul_awwal_seerah',
      hMonth: 2,
      hDay: 12,
      titleBn: 'পবিত্র সিরাতুন্নবী (সা.) ও দরুদ পাঠ',
      hijriLabelBn: '১২ রবিউল আউয়াল',
      category: 'festival',
      virtueBn: 'রাসূলুল্লাহ (সা.)-এর জীবনাদর্শ (সিরাত) অধ্যয়ন, সুন্নাহর অনুসরণ ও অধিক পরিমাণে দরুদ পাঠের বিশেষ দিন।',
      hadithRefBn: 'সহিহ মুসলিম: ৪০৮',
      buildMessage: (dateStrBn, isToday) =>
        isToday
          ? `আজ ১২ রবিউল আউয়াল (${dateStrBn})। বেশি বেশি দরুদ ও সুন্নাহ আমল করুন।`
          : `আগামী ${dateStrBn} ১২ রবিউল আউয়াল। নবীজির (সা.) সুন্নাহ ও সিরাত চর্চার প্রস্তুতি রাখছেন তো?`
    },
    {
      id: 'rajab_miraj',
      hMonth: 6,
      hDay: 27,
      titleBn: 'ইসরা ও মেরাজ স্মরণ',
      hijriLabelBn: '২৭ রজব',
      category: 'night',
      virtueBn: 'মিরাজের রজনীতে উম্মতে মুহাম্মাদির ওপর ৫ ওয়াক্ত ফরজ সালাত হাদিয়া স্বরূপ নির্ধারিত হয়।',
      hadithRefBn: 'সহিহ বুখারি: ৩৪৯',
      buildMessage: (dateStrBn) =>
        `আগামী ${dateStrBn} ২৭ রজব (ইসরা ও মেরাজ)। ৫ ওয়াক্ত সালাতে আরও যত্নবান হওয়ার প্রস্তুতি রাখছেন তো?`
    },
    {
      id: 'shaban_mid',
      hMonth: 7,
      hDay: 15,
      titleBn: 'মধ্য শাবান ও শাবানের সুন্নাহ রোজা',
      hijriLabelBn: '১৪ ও ১৫ শাবান',
      category: 'fasting',
      toggleKey: 'shaban',
      virtueBn: 'রাসূলুল্লাহ (সা.) রমজান ব্যতীত শাবান মাসেই সবচেয়ে বেশি নফল রোজা রাখতেন।',
      hadithRefBn: 'সহিহ বুখারি: ১৯৬৯',
      buildMessage: (dateStrBn) =>
        `আগামী ${dateStrBn} মধ্য শাবান ও শাবানের নফল রোজা। রমজানের পূর্বপ্রস্তুতি রাখছেন তো?`
    },
    {
      id: 'ramadan_start',
      hMonth: 8,
      hDay: 1,
      titleBn: 'পবিত্র মাহে রমজান শুরু',
      hijriLabelBn: '১ রমজান',
      category: 'fasting',
      virtueBn: 'রমজান মাসে কুরআন নাজিল হয়েছে; এ মাসে জান্নাতের দরজাসমূহ খুলে দেওয়া হয়।',
      hadithRefBn: 'সহিহ বুখারি: ১৮৯৯',
      buildMessage: (dateStrBn) =>
        `আগামী ${dateStrBn} পবিত্র মাহে রমজান শুরু। সিয়াম ও তারাবিহর প্রস্তুতি রাখছেন তো?`
    },
    {
      id: 'laylatul_qadr',
      hMonth: 8,
      hDay: 27,
      titleBn: 'শবে কদর (লাইলাতুল কদর অনুসন্ধান)',
      hijriLabelBn: 'রমজানের শেষ দশকের বিজোড় রাত',
      category: 'night',
      virtueBn: 'লাইলাতুল কদর হাজার মাসের চেয়েও শ্রেষ্ঠ। শেষ দশকের বিজোড় রাতগুলোতে ইবাদত করুন।',
      hadithRefBn: 'সহিহ বুখারি: ২০১৭',
      buildMessage: (dateStrBn) =>
        `আগামী ${dateStrBn} পবিত্র লাইলাতুল কদরের সম্ভাব্য রজনী। রাত্রি জাগরণ ও দোয়ার প্রস্তুতি রাখছেন তো?`
    },
    {
      id: 'eid_ul_fitr',
      hMonth: 9,
      hDay: 1,
      titleBn: 'পবিত্র ঈদুল ফিতর',
      hijriLabelBn: '১ শাওয়াল',
      category: 'festival',
      virtueBn: 'ঈদের নামাজের পূর্বে সদকাতুল ফিতর আদায় করা এবং তাকবির পাঠ করা সুন্নাহ।',
      hadithRefBn: 'সহিহ বুখারি: ১৫০৩',
      buildMessage: (dateStrBn) =>
        `আগামী ${dateStrBn} পবিত্র ঈদুল ফিতর। সদকাতুল ফিতর ও ঈদের সুন্নাহ পালনের প্রস্তুতি রাখছেন তো?`
    },
    {
      id: 'shawwal_six',
      hMonth: 9,
      hDay: 2,
      titleBn: 'শাওয়াল মাসের ৬টি সুন্নাহ রোজা',
      hijriLabelBn: '২ থেকে ৭ শাওয়াল',
      category: 'fasting',
      toggleKey: 'shawwalSix',
      virtueBn: 'রমজানের পর শাওয়ালের ৬ রোজা রাখলে পূর্ণ এক বছর রোজা রাখার সওয়াব পাওয়া যায়।',
      hadithRefBn: 'সহিহ মুসলিম: ১১৬৪',
      buildMessage: (dateStrBn) =>
        `আগামী ${dateStrBn} থেকে শাওয়াল মাসের ৬ রোজা শুরু। পূর্ণ বছরের সওয়াব অর্জনের প্রস্তুতি রাখছেন তো?`
    },
    {
      id: 'arafah_fast',
      hMonth: 11,
      hDay: 9,
      titleBn: 'আরাফার দিনের রোজা',
      hijriLabelBn: '৯ জিলহজ্জ',
      category: 'fasting',
      toggleKey: 'arafah',
      virtueBn: 'আরাফার দিনের রোজা পূর্ববর্তী ও পরবর্তী এক বছরের গুনাহ মোচন করে।',
      hadithRefBn: 'সহিহ মুসলিম: ১১৬২',
      buildMessage: (dateStrBn, isToday) =>
        isToday
          ? `আজ পবিত্র আরাফার দিনের রোজা (${dateStrBn})। বেশি বেশি দোয়া ও তওবা করুন।`
          : `আগামী ${dateStrBn} পবিত্র আরাফার দিনের রোজা (৯ জিলহজ্জ)। প্রস্তুতি রাখছেন তো?`
    },
    {
      id: 'eid_ul_adha',
      hMonth: 11,
      hDay: 10,
      titleBn: 'পবিত্র ঈদুল আযহা ও কুরবানি',
      hijriLabelBn: '১০ জিলহজ্জ',
      category: 'festival',
      virtueBn: 'ঈদুল আযহা ত্যাগ ও তাকওয়ার অনন্য নিদর্শন; আইয়ামে তাশরিকের তাকবির পাঠ ওয়াজিব।',
      hadithRefBn: 'সহিহ বুখারি: ৯৬৯',
      buildMessage: (dateStrBn) =>
        `আগামী ${dateStrBn} পবিত্র ঈদুল আযহা। তাকবিরে তাশরিক ও কুরবানির প্রস্তুতি রাখছেন তো?`
    }
  ];

  const foundEventIds = new Set<string>();
  for (let offset = 0; offset <= 355; offset++) {
    const d = new Date(startOfDay.getTime() + offset * 24 * 60 * 60 * 1000);
    const h = getHijriDate(d, hijriAdjustment);

    for (const def of ANNUAL_HIJRI_EVENTS) {
      if (!foundEventIds.has(def.id) && h.monthIndex === def.hMonth && h.day === def.hDay) {
        foundEventIds.add(def.id);
        const dayNumBn = toBengaliDigits(d.getDate());
        const monthBn = GREGORIAN_MONTHS_BN[d.getMonth()];
        const yearBn = toBengaliDigits(d.getFullYear());
        const shortGregBn = `${dayNumBn} ${monthBn}`;
        const fullGregBn = `${dayNumBn} ${monthBn}, ${yearBn}`;

        events.push({
          id: def.id,
          titleBn: def.titleBn,
          notificationMessageBn: def.buildMessage(shortGregBn, offset === 0),
          hijriDateLabelBn: `${def.hijriLabelBn}, ${toBengaliDigits(h.year)} হিজরি`,
          gregorianDateLabelBn: fullGregBn,
          daysRemaining: offset,
          category: def.category,
          toggleKey: def.toggleKey,
          virtueBn: def.virtueBn,
          hadithRefBn: def.hadithRefBn
        });
      }
    }
  }

  return events;
}

