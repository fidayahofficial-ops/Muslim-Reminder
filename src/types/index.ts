export type TabType = 'home' | 'prayers' | 'amal' | 'quran' | 'duas' | 'more';

export type MoreSection = 
  | 'tasbih'
  | 'qibla'
  | 'ramadan'
  | 'quiz'
  | 'hadith'
  | 'sunnah'
  | 'azkar'
  | 'prayer_guide'
  | 'hajj_guide'
  | 'hajj_countdown'
  | 'zakat'
  | 'tracker'
  | 'notes'
  | 'bookmarks'
  | 'settings'
  | 'profile'
  | 'about'
  | 'ranking';

export interface SunnahHadith {
  source: string;
  arabic: string;
  bangla: string;
}

export interface SunnahItem {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  points: string[];
  hadith: SunnahHadith;
  categoryId?: string;
  categoryTitle?: string;
}

export interface SunnahCategory {
  category_id: string;
  title: string;
  count: number;
  items: SunnahItem[];
}

export interface SunnahData {
  service_name: string;
  icon: string;
  categories: SunnahCategory[];
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  joinedDate: string;
  avatarIcon?: string;
  location?: string;
  bio?: string;
}

export interface District {
  id: string;
  nameBn: string;
  nameEn: string;
  division: string;
  lat: number;
  lng: number;
  offsetMinutes?: {
    fajr?: number;
    sunrise?: number;
    dhuhr?: number;
    asr?: number;
    maghrib?: number;
    isha?: number;
  };
}

export type JuristicMethod = 'hanafi' | 'shafii';

export type CalculationMethod = 'karachi' | 'mwl' | 'makkah' | 'egypt' | 'isna';

export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  tahajjudEnd: string;
  ishraq: string;
  chasht: string;
  dateStr: string;
  hijriDateStr: string;
  bengaliDateStr: string;
}

export interface NextPrayerInfo {
  nameKey: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  nameBn: string;
  nameEn: string;
  timeStr: string;
  remainingMinutes: number;
  remainingSeconds: number;
  percentageRemaining: number;
  isPassed: boolean;
}

export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameBengali: string;
  nameEnglish: string;
  meaningBengali: string;
  versesCount: number;
  revelationType: 'মাক্কী' | 'মাদানী';
  juzNumber: number;
}

export interface Ayah {
  numberInSurah: number;
  textArabic: string;
  textBengali: string;
  transliterationBn: string;
  textEnglish?: string;
  audioUrl?: string;
}

export interface SurahDetail extends SurahMeta {
  bismillahPre: boolean;
  ayahs: Ayah[];
}

export interface DuaItem {
  id: string;
  category: string;
  categoryBn: string;
  titleBn: string;
  titleEn?: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
  sourceBook: string;
  hadithNo?: string;
  grade?: string; // সহিহ, হাসান
  count?: number;
  note?: string;
}

export interface AzkarItem {
  id: string;
  timing: 'morning' | 'evening';
  titleBn: string;
  arabic: string;
  transliteration: string;
  translation: string;
  targetCount: number;
  reference: string;
  virtue?: string;
}

export interface QuizQuestion {
  id: string;
  category: string;
  categoryBn: string;
  difficulty: 'সহজ' | 'মাঝারি' | 'কঠিন';
  questionBn: string;
  optionsBn: string[];
  correctAnswerIndex: number;
  explanationBn: string;
  reference: string;
}

export interface HadithItem {
  id: string;
  titleBn: string;
  arabic?: string;
  translationBn: string;
  narratorBn: string;
  sourceBook: string;
  hadithNo: string;
  grade: 'সহিহ' | 'হাসান';
  chapterBn: string;
  lessonBn?: string;
}

export type PrayerAlertSound = 
  | 'azan_makkah' 
  | 'azan_madinah' 
  | 'azan_mishary' 
  | 'azan_aqsa'
  | 'azan_fajr'
  | 'chime_gentle' 
  | 'beep_soft' 
  | 'vibrate_only';

export interface PrayerAlertsToggles {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  sunrise?: boolean;
  tahajjud?: boolean;
}

export type SunnahFastingReminderTiming = 'evening_before' | 'sehri_morning' | 'both';

export interface SunnahFastingAlertsToggles {
  mondayThursday: boolean;
  ayyamAlBeed: boolean;
  arafah: boolean;
  ashura: boolean;
  shawwalSix: boolean;
  shaban: boolean;
}

export interface UserSettings {
  userName: string;
  selectedDistrictId: string;
  useGps: boolean;
  gpsCoords?: { lat: number; lng: number };
  juristicMethod: JuristicMethod;
  calcMethod: CalculationMethod;
  fajrOffset: number;
  dhuhrOffset: number;
  asrOffset: number;
  maghribOffset: number;
  ishaOffset: number;
  hijriDayAdjustment: number;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  notificationsEnabled: boolean;
  remind10MinBefore: boolean;
  prayerAlerts?: PrayerAlertsToggles;
  prayerAlertSound?: PrayerAlertSound;
  prayerCustomSounds?: Partial<Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', PrayerAlertSound>>;
  sunnahFastingNotificationsEnabled?: boolean;
  sunnahFastingReminderTiming?: SunnahFastingReminderTiming;
  sunnahFastingAlerts?: SunnahFastingAlertsToggles;
  theme: 'light' | 'dark' | 'system';
  arabicFontSize: 'normal' | 'large' | 'xlarge';
  language: 'bn' | 'en';
  dailyPrayerGoal?: number; // Target number of prayers daily (e.g. 5)
}

export interface DailyAmalRecord {
  dateKey: string; // YYYY-MM-DD
  prayers: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    tahajjud?: boolean;
    chasht?: boolean;
  };
  quranReadMinutes?: number;
  quranPagesRead?: number;
  morningAzkarDone: boolean;
  eveningAzkarDone: boolean;
  fastingDone: boolean;
  sadaqahDone: boolean;
  tasbihCount: number;
  sunnahDone?: boolean;
  completedSunnahKeys?: string[];
  duaDone?: boolean;
  completedDuaKeys?: string[];
  quizDone?: boolean;
  quizScore?: number;
  earnedCoins?: number;
}

export interface PersonalNote {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkItem {
  id: string;
  type: 'ayah' | 'dua' | 'hadith' | 'quiz';
  title: string;
  subtitle?: string;
  reference: string;
  dataRefId: string;
  createdAt: number;
}
