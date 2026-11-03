import { UserSettings, DailyAmalRecord, PersonalNote, BookmarkItem, UserProfile } from '../types';
import { DEFAULT_DISTRICT } from '../data/districts';

const KEYS = {
  SETTINGS: 'waqto_settings_v1',
  AMAL: 'waqto_amal_records_v1',
  NOTES: 'waqto_notes_v1',
  BOOKMARKS: 'waqto_bookmarks_v1',
  LAST_READ: 'waqto_quran_last_read_v1',
  QUIZ_STREAK: 'waqto_quiz_streak_v1',
  TASBIH_STATE: 'waqto_tasbih_state_v1',
  ROZA_TRACKER: 'waqto_roza_tracker_v1',
  PROFILE: 'waqto_user_profile_v1'
};

export const defaultSettings: UserSettings = {
  userName: 'মুসাফির',
  selectedDistrictId: DEFAULT_DISTRICT.id,
  useGps: false,
  juristicMethod: 'hanafi',
  calcMethod: 'karachi',
  fajrOffset: 0,
  dhuhrOffset: 0,
  asrOffset: 0,
  maghribOffset: 0,
  ishaOffset: 0,
  hijriDayAdjustment: 0,
  soundEnabled: true,
  vibrateEnabled: true,
  notificationsEnabled: false,
  remind10MinBefore: true,
  prayerAlerts: {
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
    sunrise: false,
    tahajjud: false
  },
  prayerAlertSound: 'azan_makkah',
  prayerCustomSounds: {
    fajr: 'azan_makkah',
    dhuhr: 'azan_madinah',
    asr: 'azan_mishary',
    maghrib: 'azan_makkah',
    isha: 'azan_madinah'
  },
  sunnahFastingNotificationsEnabled: false,
  sunnahFastingReminderTiming: 'both',
  sunnahFastingAlerts: {
    mondayThursday: true,
    ayyamAlBeed: true,
    arafah: true,
    ashura: true,
    shawwalSix: true,
    shaban: true
  },
  theme: 'system',
  arabicFontSize: 'large',
  language: 'bn',
  dailyPrayerGoal: 5
};

export const storage = {
  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) {
        return { ...defaultSettings, ...JSON.parse(data) };
      }
    } catch {
      // fallback
    }
    return defaultSettings;
  },

  saveSettings(settings: UserSettings) {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  },

  getAmalRecords(): Record<string, DailyAmalRecord> {
    try {
      const data = localStorage.getItem(KEYS.AMAL);
      if (data) return JSON.parse(data);
    } catch {}
    return {};
  },

  saveAmalRecord(record: DailyAmalRecord) {
    try {
      const records = storage.getAmalRecords();
      records[record.dateKey] = record;
      localStorage.setItem(KEYS.AMAL, JSON.stringify(records));
    } catch (e) {
      console.warn('Amal record save error:', e);
    }
  },

  getNotes(): PersonalNote[] {
    try {
      const data = localStorage.getItem(KEYS.NOTES);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  },

  saveNotes(notes: PersonalNote[]) {
    try {
      localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
    } catch (e) {
      console.warn('Notes save error:', e);
    }
  },

  deleteNote(id: string): PersonalNote[] {
    try {
      const existing = storage.getNotes();
      const updated = existing.filter((n) => n.id !== id);
      storage.saveNotes(updated);
      return updated;
    } catch (e) {
      console.warn('Delete note error:', e);
      return [];
    }
  },

  getUserProfile(): UserProfile {
    try {
      const data = localStorage.getItem(KEYS.PROFILE);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      id: 'user_local_1',
      name: 'মুসাফির',
      joinedDate: new Date().toISOString(),
      avatarIcon: 'moon',
      bio: 'একজন দ্বীনের পথিক ও সত্যের সন্ধানী'
    };
  },

  saveUserProfile(profile: UserProfile) {
    try {
      localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Save user profile error:', e);
    }
  },

  getBookmarks(): BookmarkItem[] {
    try {
      const data = localStorage.getItem(KEYS.BOOKMARKS);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  },

  saveBookmarks(bookmarks: BookmarkItem[]) {
    try {
      localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {
      console.warn('Bookmarks save error:', e);
    }
  },

  getLastRead(): { surahNumber: number; ayahNumber: number; surahNameBn: string } | null {
    try {
      const data = localStorage.getItem(KEYS.LAST_READ);
      if (data) return JSON.parse(data);
    } catch {}
    return { surahNumber: 1, ayahNumber: 1, surahNameBn: 'সূরা আল-ফাতিহা' };
  },

  saveLastRead(data: { surahNumber: number; ayahNumber: number; surahNameBn: string }) {
    try {
      localStorage.setItem(KEYS.LAST_READ, JSON.stringify(data));
    } catch {}
  },

  getQuizStats(): { streak: number; totalAnswered: number; correctCount: number; lastDate: string } {
    try {
      const data = localStorage.getItem(KEYS.QUIZ_STREAK);
      if (data) return JSON.parse(data);
    } catch {}
    return { streak: 1, totalAnswered: 0, correctCount: 0, lastDate: '' };
  },

  saveQuizStats(stats: { streak: number; totalAnswered: number; correctCount: number; lastDate: string }) {
    try {
      localStorage.setItem(KEYS.QUIZ_STREAK, JSON.stringify(stats));
    } catch {}
  },

  getRozaTracker(): { completedDays: number[]; qazaCount: number; targetYear: number } {
    try {
      const data = localStorage.getItem(KEYS.ROZA_TRACKER);
      if (data) return JSON.parse(data);
    } catch {}
    return { completedDays: [], qazaCount: 0, targetYear: 1448 };
  },

  saveRozaTracker(data: { completedDays: number[]; qazaCount: number; targetYear: number }) {
    try {
      localStorage.setItem(KEYS.ROZA_TRACKER, JSON.stringify(data));
    } catch {}
  }
};
