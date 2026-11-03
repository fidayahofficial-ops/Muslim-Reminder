import { DailyAmalRecord, PrayerTimes } from '../types';
import { prayerTimeToDate } from './prayerTimes';

export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_NAMES_BN: Record<PrayerKey, string> = {
  fajr: 'ফজর',
  dhuhr: 'যোহর',
  asr: 'আসর',
  maghrib: 'মাগরিব',
  isha: 'এশা'
};

export interface MissedPrayersInfo {
  dateKey: string;
  hasMissedPrayers: boolean;
  missedPrayers: PrayerKey[];
  completedPrayers: PrayerKey[];
  missedCount: number;
}

/**
 * Checks if any prayer AFTER this prayer has already been marked as done.
 * For example, if Asr is marked as done, Dhuhr and Fajr have hasLaterPrayerBeenMarked = true.
 * Once a subsequent waqt prayer is marked done, prior uncompleted prayers can no longer be marked.
 */
export function hasLaterPrayerBeenMarked(
  prayerKey: string,
  prayersRecord?: Partial<Record<string, boolean>>
): boolean {
  if (!prayersRecord) return false;
  const idx = PRAYER_KEYS.indexOf(prayerKey as PrayerKey);
  if (idx === -1) return false;
  return PRAYER_KEYS.some((key, i) => i > idx && prayersRecord[key] === true);
}

/**
 * Checks if an uncompleted prayer is locked from being marked as done.
 */
export function isPrayerLockedFromMarking(
  prayerKey: string,
  prayersRecord?: Partial<Record<string, boolean>>
): boolean {
  if (!prayersRecord) return false;
  // If already done, not locked from having been done, but locked from being marked as new
  if (prayersRecord[prayerKey]) return false;
  return hasLaterPrayerBeenMarked(prayerKey, prayersRecord);
}

/**
 * Calculates missed prayers for an Amal record.
 * Instead of showing all previous prayers as 'missed' regardless of the actual date,
 * this ONLY flags a prayer as missed if the current date matches the record date
 * and the prayer time has passed without the user marking it as done,
 * OR if a later waqt prayer has already been marked as done.
 */
export function calculateMissedPrayers(
  record: DailyAmalRecord,
  prayers?: PrayerTimes,
  currentDate: Date = new Date()
): PrayerKey[] {
  if (!record || !record.dateKey || !prayers) return [];

  const nowYear = currentDate.getFullYear();
  const nowMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const nowDay = String(currentDate.getDate()).padStart(2, '0');
  const currentDateKey = `${nowYear}-${nowMonth}-${nowDay}`;

  // Only flag as missed if the current date matches the record date!
  // Previous or future dates are never flagged as missed regardless of date.
  if (record.dateKey !== currentDateKey) {
    return [];
  }

  const sunriseDate = prayerTimeToDate(prayers.sunrise, currentDate);
  const asrDate = prayerTimeToDate(prayers.asr, currentDate);
  const maghribDate = prayerTimeToDate(prayers.maghrib, currentDate);
  const ishaDate = prayerTimeToDate(prayers.isha, currentDate);
  const t = currentDate.getTime();

  const missed: PrayerKey[] = [];

  PRAYER_KEYS.forEach((key) => {
    // If the user already marked it as done, it is not missed
    if (record.prayers?.[key]) {
      return;
    }

    let timePassed = false;
    // Condition 1: Once a later waqt prayer is marked as done, any prior uncompleted prayer is locked as missed
    if (hasLaterPrayerBeenMarked(key, record.prayers)) {
      timePassed = true;
    } else if (key === 'fajr' && t > sunriseDate.getTime()) {
      timePassed = true;
    } else if (key === 'dhuhr' && t > asrDate.getTime()) {
      timePassed = true;
    } else if (key === 'asr' && t > maghribDate.getTime()) {
      timePassed = true;
    } else if (key === 'maghrib' && t > ishaDate.getTime()) {
      timePassed = true;
    } else if (key === 'isha') {
      timePassed = false;
    }

    if (timePassed) {
      missed.push(key);
    }
  });

  return missed;
}

/**
 * Backwards compatibility helper: Only flags missed prayers if record matches current date
 */
export function checkPreviousDayMissedPrayers(
  amalRecords: Record<string, DailyAmalRecord>,
  currentDate: Date = new Date(),
  prayers?: PrayerTimes
): MissedPrayersInfo {
  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);

  const prevYear = prevDate.getFullYear();
  const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
  const prevDay = String(prevDate.getDate()).padStart(2, '0');
  const previousDateKey = `${prevYear}-${prevMonth}-${prevDay}`;

  const prevRecord = amalRecords[previousDateKey];
  const completedPrayers: PrayerKey[] = [];

  PRAYER_KEYS.forEach((key) => {
    if (prevRecord?.prayers?.[key] === true) {
      completedPrayers.push(key);
    }
  });

  // Previous days do NOT show all prayers as 'missed' regardless of the actual date.
  // Instead, only return missed prayers if current date matches record date.
  return {
    dateKey: previousDateKey,
    hasMissedPrayers: false,
    missedPrayers: [],
    completedPrayers,
    missedCount: 0
  };
}
