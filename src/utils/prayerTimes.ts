import {
  Coordinates,
  CalculationMethod as AdhanCalcMethod,
  Madhab,
  PrayerTimes as AdhanPrayerTimes
} from 'adhan';
import { JuristicMethod, CalculationMethod, PrayerTimes, NextPrayerInfo } from '../types';

// Convert English numbers to Bengali numerals
export function toBengaliDigits(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/[0-9]/g, (w) => bnDigits[+w]);
}

// Convert Bengali numerals to English string if needed
export function toEnglishDigits(str: string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let res = str;
  bnDigits.forEach((bn, idx) => {
    res = res.replaceAll(bn, idx.toString());
  });
  return res;
}

// Format Date to Bengali date string (e.g. ২৫ সেপ্টেম্বর ২০২৬)
export function formatBengaliDate(date: Date): string {
  const monthsBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const daysBn = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  
  const day = toBengaliDigits(date.getDate());
  const month = monthsBn[date.getMonth()];
  const year = toBengaliDigits(date.getFullYear());
  const weekDay = daysBn[date.getDay()];

  return `${day} ${month}, ${year} (${weekDay})`;
}

// Approximated Traditional Bengali Calendar Season / Date
export function getTraditionalBengaliDate(date: Date): string {
  // Bengali calendar: Boishakh starts ~April 14
  const startOfYear = new Date(date.getFullYear(), 3, 14); // Apr 14
  let bYear = date.getFullYear() - 593;
  if (date < startOfYear) {
    bYear -= 1;
  }
  
  const bMonths = [
    'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
    'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'
  ];
  
  // Approximate day & month based on current day of year
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  let bMonthIndex = 0;
  let bDay = 1;
  
  if (dayOfYear >= 104) {
    const daysSinceBoishakh = dayOfYear - 104;
    bMonthIndex = Math.min(Math.floor(daysSinceBoishakh / 30.5), 11);
    bDay = Math.floor(daysSinceBoishakh % 30.5) + 1;
  } else {
    const daysSincePoush = dayOfYear + 261;
    bMonthIndex = Math.min(Math.floor(daysSincePoush / 30.5), 11);
    bDay = Math.floor(daysSincePoush % 30.5) + 1;
  }

  return `${toBengaliDigits(bDay)} ${bMonths[bMonthIndex]}, ${toBengaliDigits(bYear)} বঙ্গাব্দ`;
}

// Accurate Hijri Calendar Calculation
export function getHijriDate(date: Date, adjustmentDays: number = 0): {
  day: number;
  monthIndex: number;
  monthNameBn: string;
  monthNameAr: string;
  year: number;
  formattedBn: string;
} {
  const hijriMonthsBn = [
    'মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি', 'জমাদিউল আউয়াল', 'জমাদিউস সানি',
    'রজব', 'শাবান', 'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ্জ'
  ];
  const hijriMonthsAr = [
    'المُحَرَّم', 'صَفَر', 'رَبِيع الأَوَّل', 'رَبِيع الآخِر', 'جُمَادَى الأُولَى', 'جُمَادَى الآخِرَة',
    'رَجَب', 'شَعْبَان', 'رَمَضَان', 'شَوَّال', 'ذُو القَعْدَة', 'ذُو الحِجَّة'
  ];

  const adjDate = new Date(date.getTime() + adjustmentDays * 24 * 60 * 60 * 1000);
  
  // Astronomical Julian day calculation
  let m = adjDate.getMonth() + 1;
  let y = adjDate.getFullYear();
  let d = adjDate.getDate();

  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;

  const z = Math.floor(jd);
  const cyc = Math.floor((z - 1948440 + 10632) / 10631);
  const rem = (z - 1948440 + 10632) - 10631 * cyc;
  
  const hYear = Math.floor((z - 1948440) / 354.36707) + 1;
  const daysInYear = Math.floor((z - 1948440) % 354.36707);
  let hMonth = Math.floor(daysInYear / 29.53059);
  if (hMonth < 0) hMonth = 0;
  if (hMonth > 11) hMonth = 11;

  let hDay = Math.floor(daysInYear - (hMonth * 29.53059)) + 1;
  if (hDay > 30) hDay = 30;
  if (hDay < 1) hDay = 1;

  return {
    day: hDay,
    monthIndex: hMonth,
    monthNameBn: hijriMonthsBn[hMonth],
    monthNameAr: hijriMonthsAr[hMonth],
    year: hYear,
    formattedBn: `${toBengaliDigits(hDay)} ${hijriMonthsBn[hMonth]}, ${toBengaliDigits(hYear)} হিজরি`
  };
}

// Astronomical Real Location Prayer Calculation using Adhan library
export function computePrayerTimes(
  date: Date,
  lat: number,
  lng: number,
  juristic: JuristicMethod = 'hanafi',
  calcMethod: CalculationMethod = 'karachi',
  offsets: { fajr?: number; dhuhr?: number; asr?: number; maghrib?: number; isha?: number } = {},
  hijriAdjustment: number = 0
): PrayerTimes {
  // Detect if location is in Bangladesh (approx lat 20.5 - 26.8, lng 88.0 - 92.8)
  const isBangladesh = lat >= 20.5 && lat <= 26.8 && lng >= 88.0 && lng <= 92.8;
  const targetTimeZone = isBangladesh ? 'Asia/Dhaka' : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Extract year, month, day for the target timezone
  const dFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTimeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = dFormatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || `${date.getFullYear()}`, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || `${date.getMonth() + 1}`, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || `${date.getDate()}`, 10);

  // Compute solar position based on midday UTC for stability across midnight transitions
  const calcDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
  const coordinates = new Coordinates(lat, lng);

  // Select calculation method parameters
  let params;
  switch (calcMethod) {
    case 'mwl':
      params = AdhanCalcMethod.MuslimWorldLeague();
      break;
    case 'makkah':
      params = AdhanCalcMethod.UmmAlQura();
      break;
    case 'egypt':
      params = AdhanCalcMethod.Egyptian();
      break;
    case 'isna':
      params = AdhanCalcMethod.NorthAmerica();
      break;
    case 'karachi':
    default:
      // Standard for Bangladesh (Islamic Foundation Bangladesh), Pakistan, India
      params = AdhanCalcMethod.Karachi();
      break;
  }

  // Set Juristic Method (Asr shadow factor: Hanafi = 2x, Shafi'i = 1x)
  params.madhab = juristic === 'shafii' ? Madhab.Shafi : Madhab.Hanafi;

  // Apply user-defined minute offsets if configured
  if (offsets.fajr) params.adjustments.fajr = offsets.fajr;
  if (offsets.dhuhr) params.adjustments.dhuhr = offsets.dhuhr;
  if (offsets.asr) params.adjustments.asr = offsets.asr;
  if (offsets.maghrib) params.adjustments.maghrib = offsets.maghrib;
  if (offsets.isha) params.adjustments.isha = offsets.isha;

  // Compute astronomical prayer times
  const pt = new AdhanPrayerTimes(coordinates, calcDate, params);

  // Time formatter
  const formatTime = (d: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d).replace(/[\s\u202f\u00a0]+/g, ' ').trim();
  };

  // Additional voluntary and sunnah prayer moments
  // Ishraq: ~18 mins after sunrise (when the sun has risen about a spear's height)
  const ishraqDate = new Date(pt.sunrise.getTime() + 18 * 60 * 1000);
  // Chasht (Salat al-Duha): Midpoint between sunrise and midday
  const chashtDate = new Date(pt.sunrise.getTime() + (pt.dhuhr.getTime() - pt.sunrise.getTime()) / 2);

  const hijri = getHijriDate(date, hijriAdjustment);

  return {
    fajr: formatTime(pt.fajr),
    sunrise: formatTime(pt.sunrise),
    dhuhr: formatTime(pt.dhuhr),
    asr: formatTime(pt.asr),
    maghrib: formatTime(pt.maghrib),
    isha: formatTime(pt.isha),
    tahajjudEnd: formatTime(pt.fajr),
    ishraq: formatTime(ishraqDate),
    chasht: formatTime(chashtDate),
    dateStr: formatBengaliDate(date),
    hijriDateStr: hijri.formattedBn,
    bengaliDateStr: getTraditionalBengaliDate(date)
  };
}

// Convert "05:15 AM" time string to Date object for today with robust unicode & whitespace handling
export function prayerTimeToDate(timeStr: string, baseDate: Date = new Date()): Date {
  const d = new Date(baseDate);
  if (!timeStr) return d;

  // Normalize all unicode whitespaces (including narrow no-break space \u202f and \u00a0)
  const normalized = timeStr.replace(/[\s\u202f\u00a0]+/g, ' ').trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  
  if (!match) {
    return d;
  }

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;
  
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  d.setHours(h, m, 0, 0);
  return d;
}

// Calculate which prayer is current and which is next
export function getNextPrayer(prayers: PrayerTimes, now: Date = new Date()): {
  currentPrayer: { nameBn: string; nameKey: string; timeStr: string };
  nextPrayer: NextPrayerInfo;
} {
  const fajrDate = prayerTimeToDate(prayers.fajr, now);
  const sunriseDate = prayerTimeToDate(prayers.sunrise, now);
  const dhuhrDate = prayerTimeToDate(prayers.dhuhr, now);
  const asrDate = prayerTimeToDate(prayers.asr, now);
  const maghribDate = prayerTimeToDate(prayers.maghrib, now);
  const ishaDate = prayerTimeToDate(prayers.isha, now);

  const prayerList: Array<{
    key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    nameBn: string;
    nameEn: string;
    timeStr: string;
    dateObj: Date;
  }> = [
    { key: 'fajr', nameBn: 'ফজর', nameEn: 'Fajr', timeStr: prayers.fajr, dateObj: fajrDate },
    { key: 'sunrise', nameBn: 'সূর্যোদয়', nameEn: 'Sunrise', timeStr: prayers.sunrise, dateObj: sunriseDate },
    { key: 'dhuhr', nameBn: 'যোহর', nameEn: 'Dhuhr', timeStr: prayers.dhuhr, dateObj: dhuhrDate },
    { key: 'asr', nameBn: 'আসর', nameEn: 'Asr', timeStr: prayers.asr, dateObj: asrDate },
    { key: 'maghrib', nameBn: 'মাগরিব', nameEn: 'Maghrib', timeStr: prayers.maghrib, dateObj: maghribDate },
    { key: 'isha', nameBn: 'এশা', nameEn: 'Isha', timeStr: prayers.isha, dateObj: ishaDate }
  ];

  const nowMs = now.getTime();

  // Period between 12:00 AM (midnight) and Fajr:
  // The new date has started; next prayer is today's Fajr (first foroj prayer)!
  if (nowMs < fajrDate.getTime()) {
    const diffMs = fajrDate.getTime() - nowMs;
    const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const remainingMinutes = Math.floor(remainingSeconds / 60);

    const yesterday = new Date(nowMs - 24 * 60 * 60 * 1000);
    const prevIshaDate = prayerTimeToDate(prayers.isha, yesterday);
    const totalWindowMs = Math.max(1, fajrDate.getTime() - prevIshaDate.getTime());
    const elapsedMs = Math.max(0, nowMs - prevIshaDate.getTime());
    const percentage = Math.min(100, Math.max(0, Math.round((elapsedMs / totalWindowMs) * 100)));

    return {
      currentPrayer: {
        nameBn: 'তাহাজ্জুদ / শেষ রাত',
        nameKey: 'tahajjud',
        timeStr: 'সুবহে সাদিক পর্যন্ত'
      },
      nextPrayer: {
        nameKey: 'fajr',
        nameBn: 'ফজর',
        nameEn: 'Fajr',
        timeStr: prayers.fajr,
        remainingMinutes,
        remainingSeconds,
        percentageRemaining: percentage,
        isPassed: false
      }
    };
  }

  // Find next prayer today
  const nextIdx = prayerList.findIndex((p) => p.dateObj.getTime() > nowMs);

  // If all prayers for today passed (after today's Isha) -> Next is tomorrow's Fajr
  if (nextIdx === -1) {
    const tomorrow = new Date(nowMs + 24 * 60 * 60 * 1000);
    const tomorrowFajr = prayerTimeToDate(prayers.fajr, tomorrow);
    const diffMs = tomorrowFajr.getTime() - nowMs;
    const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const remainingMinutes = Math.floor(remainingSeconds / 60);

    const totalWindowMs = Math.max(1, tomorrowFajr.getTime() - ishaDate.getTime());
    const elapsedMs = Math.max(0, nowMs - ishaDate.getTime());
    const percentage = Math.min(100, Math.max(0, Math.round((elapsedMs / totalWindowMs) * 100)));

    return {
      currentPrayer: { nameBn: 'এশা', nameKey: 'isha', timeStr: prayers.isha },
      nextPrayer: {
        nameKey: 'fajr',
        nameBn: 'ফজর (আগামীকাল)',
        nameEn: 'Fajr (Tomorrow)',
        timeStr: prayers.fajr,
        remainingMinutes,
        remainingSeconds,
        percentageRemaining: percentage,
        isPassed: false
      }
    };
  }

  const currentIdx = nextIdx - 1;
  const nextItem = prayerList[nextIdx];
  const curItem = prayerList[currentIdx];

  const diffMs = nextItem.dateObj.getTime() - nowMs;
  const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const remainingMinutes = Math.floor(remainingSeconds / 60);

  // Interval between current and next
  const totalWindowMs = Math.max(1, nextItem.dateObj.getTime() - curItem.dateObj.getTime());
  const elapsedMs = Math.max(0, nowMs - curItem.dateObj.getTime());
  const percentage = Math.min(100, Math.max(0, Math.round((elapsedMs / totalWindowMs) * 100)));

  return {
    currentPrayer: {
      nameBn: curItem.nameBn,
      nameKey: curItem.key,
      timeStr: curItem.timeStr
    },
    nextPrayer: {
      nameKey: nextItem.key,
      nameBn: nextItem.nameBn,
      nameEn: nextItem.nameEn,
      timeStr: nextItem.timeStr,
      remainingMinutes,
      remainingSeconds,
      percentageRemaining: percentage,
      isPassed: false
    }
  };
}

// Convert degrees to radians
function degToRad(deg: number) { return (deg * Math.PI) / 180.0; }
// Convert radians to degrees
function radToDeg(rad: number) { return (rad * 180.0) / Math.PI; }

// Accurate Qibla Direction (bearing) from any Lat/Lng to Mecca Kaaba (21.4225° N, 39.8262° E)
export function calculateQiblaBearing(lat: number, lng: number): number {
  const meccaLat = degToRad(21.4225);
  const meccaLng = degToRad(39.8262);
  const userLat = degToRad(lat);
  const userLng = degToRad(lng);

  const deltaLng = meccaLng - userLng;
  const y = Math.sin(deltaLng) * Math.cos(meccaLat);
  const x = Math.cos(userLat) * Math.sin(meccaLat) - Math.sin(userLat) * Math.cos(meccaLat) * Math.cos(deltaLng);

  let bearing = radToDeg(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;
  return Math.round(bearing * 10) / 10;
}

// Distance to Mecca in Kilometers
export function calculateDistanceToMecca(lat: number, lng: number): number {
  const R = 6371; // Earth radius in km
  const dLat = degToRad(21.4225 - lat);
  const dLng = degToRad(39.8262 - lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat)) * Math.cos(degToRad(21.4225)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export type WaqtStatus = 'completed' | 'current' | 'missed' | 'upcoming';

/**
 * Accurately determines if a prayer waqt is completed, actively ongoing, missed (expired / kaza), or upcoming.
 * A waqt is missed if its valid prayer time window has ended and it was not marked as completed.
 */
export function getPrayerWaqtStatus(
  prayerKey: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
  prayers: PrayerTimes,
  isDone: boolean,
  now: Date = new Date(),
  isPastDate: boolean = false
): WaqtStatus {
  if (isDone) return 'completed';
  if (isPastDate) return 'missed';

  const fajrDate = prayerTimeToDate(prayers.fajr, now);
  const sunriseDate = prayerTimeToDate(prayers.sunrise, now);
  const dhuhrDate = prayerTimeToDate(prayers.dhuhr, now);
  const asrDate = prayerTimeToDate(prayers.asr, now);
  const maghribDate = prayerTimeToDate(prayers.maghrib, now);
  const ishaDate = prayerTimeToDate(prayers.isha, now);

  const t = now.getTime();

  if (prayerKey === 'fajr') {
    if (t < fajrDate.getTime()) return 'upcoming';
    if (t > sunriseDate.getTime()) return 'missed';
    return 'current';
  }

  if (prayerKey === 'dhuhr') {
    if (t < dhuhrDate.getTime()) return 'upcoming';
    if (t > asrDate.getTime()) return 'missed';
    return 'current';
  }

  if (prayerKey === 'asr') {
    if (t < asrDate.getTime()) return 'upcoming';
    if (t > maghribDate.getTime()) return 'missed';
    return 'current';
  }

  if (prayerKey === 'maghrib') {
    if (t < maghribDate.getTime()) return 'upcoming';
    if (t > ishaDate.getTime()) return 'missed';
    return 'current';
  }

  if (prayerKey === 'isha') {
    if (t < ishaDate.getTime()) return 'upcoming';
    // If it is late night / past midnight, today's evening Isha hasn't even arrived yet (t < ishaDate will be true!)
    return 'current';
  }

  return 'upcoming';
}

