import { HadithItem, DuaItem } from '../types';
import { AUTHENTIC_HADITHS } from '../data/hadiths';
import { AUTHENTIC_DUAS } from '../data/duas';

export interface BangladeshDateInfo {
  year: number;
  month: number;
  day: number;
  weekday: number; // 0 = Sunday ... 5 = Friday, 6 = Saturday
  dateKey: string;
}

/**
 * Extracts current calendar date strictly according to Bangladesh Standard Time (Asia/Dhaka, UTC+6).
 * Safe across all client system timezones, operating systems, and device settings.
 */
export function getBangladeshDate(date: Date = new Date()): BangladeshDateInfo {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });

    const parts = formatter.formatToParts(date);
    let year = 2026;
    let month = 1;
    let day = 1;
    let weekdayStr = 'Sat';

    for (const part of parts) {
      if (part.type === 'year') year = parseInt(part.value, 10);
      if (part.type === 'month') month = parseInt(part.value, 10);
      if (part.type === 'day') day = parseInt(part.value, 10);
      if (part.type === 'weekday') weekdayStr = part.value;
    }

    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6
    };
    const weekday = weekdayMap[weekdayStr] ?? new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, weekday, dateKey };
  } catch (err) {
    // Robust fallback: offset UTC by +6 hours (BST has no daylight saving time)
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const bdDate = new Date(utcTime + 6 * 3600000);
    const year = bdDate.getFullYear();
    const month = bdDate.getMonth() + 1;
    const day = bdDate.getDate();
    const weekday = bdDate.getDay();
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, weekday, dateKey };
  }
}

/**
 * Deterministically returns the authentic Hadith of the Day based on Bangladesh Time (Asia/Dhaka).
 */
export function getDailyHadith(date: Date = new Date()): HadithItem {
  const { day } = getBangladeshDate(date);
  const total = AUTHENTIC_HADITHS.length;
  const index = Math.abs(day - 1) % total;
  return AUTHENTIC_HADITHS[index];
}

/**
 * Deterministically returns the Daily Dua for the Home Screen based on Bangladesh Time (Asia/Dhaka):
 * - Anchor Date: 2026-09-26 (Saturday) -> Index 0 (Ayatul Kursi)
 * - Next Day: 2026-09-27 (Sunday) -> Index 1 (Durood Ibrahim)
 * - Every Friday (weekday === 5): Always shows Durood Sharif (durood_ibrahim / durood_ahmad_salawat)
 * - Remaining Days: Steps sequentially 1-by-1 from first to last through AUTHENTIC_DUAS without skipping any item.
 */
export function getDailyDua(date: Date = new Date()): { dua: DuaItem; isFridayDurood: boolean; sequenceIndex: number; totalDuas: number } {
  const { year, month, day, weekday } = getBangladeshDate(date);
  const total = AUTHENTIC_DUAS.length;

  // On Friday (জুমার দিন), always feature Durood Sharif
  if (weekday === 5) {
    const fridayDuroods = AUTHENTIC_DUAS.filter((d) =>
      d.id === 'durood_ibrahim' || d.id === 'durood_ahmad_salawat' || d.id === 'durood_short_salawat'
    );
    const currentUtcMidnight = Date.UTC(year, month - 1, day);
    const weekNumber = Math.floor(currentUtcMidnight / (7 * 86400000));
    const chosenDurood =
      fridayDuroods.length > 0
        ? fridayDuroods[Math.abs(weekNumber) % fridayDuroods.length]
        : AUTHENTIC_DUAS[1] || AUTHENTIC_DUAS[0];
    const idx = Math.max(0, AUTHENTIC_DUAS.findIndex((d) => d.id === chosenDurood.id));
    return {
      dua: chosenDurood,
      isFridayDurood: true,
      sequenceIndex: idx + 1,
      totalDuas: total
    };
  }

  // Anchor date: 2026-09-26 UTC midnight -> Index 0 (Ayatul Kursi)
  const anchorUtcMs = Date.UTC(2026, 8, 26); // Month is 0-indexed: 8 = September
  const targetUtcMs = Date.UTC(year, month - 1, day);
  const diffDays = Math.round((targetUtcMs - anchorUtcMs) / 86400000);

  // Count non-Friday days between anchor (2026-09-26, Saturday) and target date so no Dua is ever skipped on Fridays
  let nonFridaySteps = 0;
  if (diffDays > 0) {
    for (let d = 1; d <= diffDays; d++) {
      const checkDayOfWeek = (6 + d) % 7; // 2026-09-26 is Saturday (6)
      if (checkDayOfWeek !== 5) {
        nonFridaySteps++;
      }
    }
  } else if (diffDays < 0) {
    for (let d = -1; d >= diffDays; d--) {
      const checkDayOfWeek = (((6 + d) % 7) + 7) % 7;
      if (checkDayOfWeek !== 5) {
        nonFridaySteps--;
      }
    }
  }

  const index = ((nonFridaySteps % total) + total) % total;
  return {
    dua: AUTHENTIC_DUAS[index],
    isFridayDurood: false,
    sequenceIndex: index + 1,
    totalDuas: total
  };
}
