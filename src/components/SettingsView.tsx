import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  MapPin, 
  Volume2, 
  VolumeX,
  Vibrate, 
  ShieldCheck, 
  Trash2, 
  Sun, 
  Moon, 
  Laptop,
  User,
  Info,
  Trophy,
  AlertTriangle,
  Bell,
  BellRing,
  Play,
  Square,
  Check,
  Sparkles,
  Clock,
  Music,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sunrise,
  Sunset,
  Calendar,
  Send,
  Type
} from 'lucide-react';
import { 
  UserSettings, 
  District, 
  MoreSection, 
  PrayerAlertSound, 
  PrayerAlertsToggles,
  SunnahFastingAlertsToggles,
  SunnahFastingReminderTiming
} from '../types';
import { 
  soundManager, 
  triggerHaptic, 
  requestNotificationPermission, 
  sendNotification,
  PRAYER_ALERT_SOUND_OPTIONS, 
  PrayerAlertSoundOption 
} from '../utils/audio';
import { toBengaliDigits, getHijriDate } from '../utils/prayerTimes';
import { 
  SUNNAH_FASTING_CATEGORIES, 
  DEFAULT_SUNNAH_FASTING_TOGGLES, 
  getUpcomingSunnahFastingDays 
} from '../utils/sunnahFasting';

interface SettingsViewProps {
  settings: UserSettings;
  district: District;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenDistrictModal: () => void;
  onNavigateSection?: (section: MoreSection) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  district,
  onUpdateSettings,
  onOpenDistrictModal,
  onNavigateSection
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [isPerPrayerSoundExpanded, setIsPerPrayerSoundExpanded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [sunnahTestBanner, setSunnahTestBanner] = useState<string | null>(null);

  // Check notification permission on mount and subscribe to audio state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }

    const unsub = soundManager.subscribe((id) => {
      setPlayingSoundId(id);
    });

    return () => {
      unsub();
      soundManager.stopAudio();
    };
  }, []);

  // Request browser notification permission
  const handleRequestNotification = async () => {
    triggerHaptic(25);
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
      onUpdateSettings({ notificationsEnabled: true });
    } else {
      setNotificationPermission('denied');
      onUpdateSettings({ notificationsEnabled: false });
    }
  };

  // Preview or Stop alert sound
  const handleToggleSoundPreview = (soundId: PrayerAlertSound) => {
    if (playingSoundId === soundId) {
      soundManager.stopAudio();
      setPlayingSoundId(null);
    } else {
      triggerHaptic(20);
      setPlayingSoundId(soundId);
      soundManager.playPrayerAlert(soundId, () => {
        setPlayingSoundId(null);
      });
    }
  };

  // Ensure prayerAlerts object exists with defaults
  const prayerAlerts: PrayerAlertsToggles = settings.prayerAlerts || {
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
    sunrise: false,
    tahajjud: false
  };

  const activeSound = settings.prayerAlertSound || 'azan_makkah';
  const customSounds = settings.prayerCustomSounds || {};

  // Toggle single prayer notification
  const handleToggleSinglePrayer = (prayerKey: keyof PrayerAlertsToggles) => {
    triggerHaptic(20);
    const updated: PrayerAlertsToggles = {
      ...prayerAlerts,
      [prayerKey]: !prayerAlerts[prayerKey]
    };
    onUpdateSettings({ prayerAlerts: updated });
  };

  // Toggle all prayers at once
  const handleToggleAllPrayers = (enable: boolean) => {
    triggerHaptic(30);
    const updated: PrayerAlertsToggles = {
      fajr: enable,
      dhuhr: enable,
      asr: enable,
      maghrib: enable,
      isha: enable,
      sunrise: enable,
      tahajjud: enable
    };
    onUpdateSettings({ prayerAlerts: updated });
  };

  // Set global sound
  const handleSelectGlobalSound = (sound: PrayerAlertSound) => {
    triggerHaptic(25);
    onUpdateSettings({ prayerAlertSound: sound });
  };

  // Set individual sound for specific prayer
  const handleSelectPrayerCustomSound = (prayerKey: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', sound: PrayerAlertSound) => {
    triggerHaptic(20);
    const updatedCustom = {
      ...customSounds,
      [prayerKey]: sound
    };
    onUpdateSettings({ prayerCustomSounds: updatedCustom });
  };

  // Sunnah Fasting Notifications state & handlers
  const isSunnahFastingEnabled = !!settings.sunnahFastingNotificationsEnabled;
  const sunnahReminderTiming: SunnahFastingReminderTiming = settings.sunnahFastingReminderTiming || 'both';
  const sunnahFastingAlerts: SunnahFastingAlertsToggles = {
    ...DEFAULT_SUNNAH_FASTING_TOGGLES,
    ...(settings.sunnahFastingAlerts || {})
  };

  const currentHijri = useMemo(() => {
    return getHijriDate(new Date(), settings.hijriDayAdjustment || 0);
  }, [settings.hijriDayAdjustment]);

  const upcomingSunnahDays = useMemo(() => {
    return getUpcomingSunnahFastingDays(new Date(), settings.hijriDayAdjustment || 0, sunnahFastingAlerts, 4);
  }, [settings.hijriDayAdjustment, sunnahFastingAlerts]);

  const handleToggleSunnahFastingMaster = async (enable: boolean) => {
    triggerHaptic(25);
    if (enable && notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationPermission('granted');
        onUpdateSettings({
          sunnahFastingNotificationsEnabled: true,
          notificationsEnabled: true
        });
        return;
      }
    }
    onUpdateSettings({ sunnahFastingNotificationsEnabled: enable });
  };

  const handleToggleSingleSunnahFast = (fastKey: keyof SunnahFastingAlertsToggles) => {
    triggerHaptic(20);
    const updated: SunnahFastingAlertsToggles = {
      ...sunnahFastingAlerts,
      [fastKey]: !sunnahFastingAlerts[fastKey]
    };
    onUpdateSettings({ sunnahFastingAlerts: updated });
  };

  const handleToggleAllSunnahFasts = (enable: boolean) => {
    triggerHaptic(25);
    const updated: SunnahFastingAlertsToggles = {
      mondayThursday: enable,
      ayyamAlBeed: enable,
      arafah: enable,
      ashura: enable,
      shawwalSix: enable,
      shaban: enable
    };
    onUpdateSettings({ sunnahFastingAlerts: updated });
  };

  const handleSendTestSunnahNotification = async () => {
    triggerHaptic([30, 50, 30]);
    if (notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationPermission('granted');
        onUpdateSettings({ notificationsEnabled: true, sunnahFastingNotificationsEnabled: true });
      }
    }

    if (settings.soundEnabled) {
      soundManager.playPrayerChime();
    }

    const nextFast = upcomingSunnahDays[0];
    const title = nextFast
      ? `সুন্নাহ রোজা স্মরণবার্তা — ${nextFast.primaryTitleBn}`
      : 'সুন্নাহ রোজার পুশ নোটিফিকেশন সক্রিয় রয়েছে';
    const body = nextFast
      ? `তারিখ: ${nextFast.hijriDateBn} (${nextFast.gregorianDateBn})। ফজিলত: ${nextFast.virtueBn}`
      : `আজকের হিজরি তারিখ: ${currentHijri.formattedBn}। নির্ধারিত সুন্নাহ রোজার পূর্বে স্বয়ংক্রিয় নোটিফিকেশন পাঠানো হবে।`;

    sendNotification(title, body);
    setSunnahTestBanner(`${title} • ${body}`);
    setTimeout(() => {
      setSunnahTestBanner(null);
    }, 5000);
  };

  const handleConfirmClearAllData = () => {
    triggerHaptic(50);
    localStorage.clear();
    setShowClearConfirm(false);
    window.location.reload();
  };

  const PRAYER_LIST = [
    { key: 'fajr' as const, nameBn: 'ফজর সালাত', subtitleBn: 'ভোরের আলো ফোটার সময়', icon: Sunrise },
    { key: 'dhuhr' as const, nameBn: 'যোহর সালাত', subtitleBn: 'দুপুরের নামাজ', icon: Sun },
    { key: 'asr' as const, nameBn: 'আসর সালাত', subtitleBn: 'বিকেলের নামাজ', icon: Sun },
    { key: 'maghrib' as const, nameBn: 'মাগরিব সালাত', subtitleBn: 'সূর্যাস্তের মুহূর্ত', icon: Sunset },
    { key: 'isha' as const, nameBn: 'এশা সালাত', subtitleBn: 'রাত্রির নিবিড় ইবাদত', icon: Moon },
    { key: 'tahajjud' as const, nameBn: 'তাহাজ্জুদ সালাত', subtitleBn: 'রাতের শেষ প্রহরের ডাক', icon: Sparkles },
    { key: 'sunrise' as const, nameBn: 'সূর্যোদয় / ইশরাক', subtitleBn: 'নিষিদ্ধ সময়ের সমাপ্তি', icon: Sunrise }
  ];

  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800">
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2 leading-snug">
          <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>সেটিংস ও পছন্দসমূহ</span>
        </h2>
        <p className="text-sm text-stone-700 dark:text-stone-200 font-medium mt-1 leading-relaxed">
          ওয়াক্ত — আপনার দ্বীনের সঙ্গী (ভার্সন ১.২.০)
        </p>
      </div>

      {/* Navigation Quick Links: Profile, Ranking, About */}
      {onNavigateSection && (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onNavigateSection('profile')}
            className="p-3 rounded-2xl bg-white dark:bg-[#151B22] border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col items-center justify-center gap-1.5 hover:border-emerald-500/50 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100">প্রোফাইল</span>
          </button>

          <button
            onClick={() => onNavigateSection('ranking')}
            className="p-3 rounded-2xl bg-white dark:bg-[#151B22] border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col items-center justify-center gap-1.5 hover:border-emerald-500/50 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100">র‍্যাংকিং</span>
          </button>

          <button
            onClick={() => onNavigateSection('about')}
            className="p-3 rounded-2xl bg-white dark:bg-[#151B22] border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col items-center justify-center gap-1.5 hover:border-emerald-500/50 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100">পরিচিতি</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* PRAYER NOTIFICATION SETTINGS UI (নামাজের নোটিফিকেশন ও আজান সেটিংস) */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-emerald-500/30 dark:border-emerald-500/20 space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-50 leading-snug">
                নামাজের নোটিফিকেশন ও আজান সেটিংস
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium leading-relaxed mt-0.5">
                ওয়াক্তভিত্তিক অ্যালার্ট টগল ও কাস্টম আজানের সুর নির্বাচন
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold border border-emerald-200 dark:border-emerald-800 shrink-0">
            {settings.soundEnabled ? 'সাউন্ড সক্রিয়' : 'নীরব'}
          </span>
        </div>

        {/* Master Sound & Push Alert Controls */}
        <div className="space-y-3 bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-700/60">
          {/* Master Sound Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <VolumeX className="w-5 h-5 text-stone-400 shrink-0" />
              )}
              <div>
                <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">
                  আজান ও অ্যালার্ট সাউন্ড
                </span>
                <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium leading-relaxed block">
                  ওয়াক্তের শুরুতে স্বয়ংক্রিয়ভাবে অডিও বাজবে
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* 10-Minute Before Alert */}
          <div className="flex items-center justify-between pt-2.5 border-t border-stone-200/60 dark:border-stone-700/60">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">
                  ১০ মিনিট পূর্বে অগ্রিম অ্যালার্ট
                </span>
                <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium leading-relaxed block">
                  ওয়াক্ত হওয়ার পূর্বে প্রস্তুতির জন্য মৃদু স্মরণবার্তা
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.remind10MinBefore}
                onChange={(e) => onUpdateSettings({ remind10MinBefore: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Vibration / Haptics */}
          <div className="flex items-center justify-between pt-2.5 border-t border-stone-200/60 dark:border-stone-700/60">
            <div className="flex items-center gap-3">
              <Vibrate className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">
                  হ্যাপটিক ভাইব্রেশন
                </span>
                <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium leading-relaxed block">
                  ডিভাইসে মৃদু কম্পন অ্যালার্ট
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.vibrateEnabled}
                onChange={(e) => onUpdateSettings({ vibrateEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Browser Push Notification Banner */}
          <div className="flex items-center justify-between pt-2.5 border-t border-stone-200/60 dark:border-stone-700/60">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">
                  সিস্টেম নোটিফিকেশন
                </span>
                <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium leading-relaxed block">
                  {notificationPermission === 'granted'
                    ? 'অনুমোদিত • স্ক্রিনে পপআপ আসবে'
                    : 'ব্রাউজারে নোটিফিকেশনের অনুমতি দিন'}
                </span>
              </div>
            </div>
            {notificationPermission === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                অনুমোদিত
              </span>
            ) : (
              <button
                onClick={handleRequestNotification}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                অনুমতি দিন
              </button>
            )}
          </div>

          {/* Android Battery & Exact Alarm Guidance */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-900 dark:text-amber-200 block">
                Android ব্যাকগ্রাউন্ড আজান ও অ্যালার্ম সতর্কতা
              </span>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                সঠিক সময়ে আজান চালানোর জন্য ফোনের Settings থেকে এই অ্যাপটির Battery Optimization বন্ধ রাখুন এবং Alarms & Reminders অনুমতি সক্রিয় রাখুন।
              </p>
            </div>
          </div>
        </div>

        {/* 1. Individual Prayer Alerts Toggles */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-normal text-stone-800 dark:text-stone-200">
              ওয়াক্তভিত্তিক পৃথক অ্যালার্ট
            </span>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <button
                onClick={() => handleToggleAllPrayers(true)}
                className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                সবগুলো চালু
              </button>
              <span className="text-stone-400 dark:text-stone-600 font-normal">•</span>
              <button
                onClick={() => handleToggleAllPrayers(false)}
                className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
              >
                সবগুলো বন্ধ
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {PRAYER_LIST.map((p) => {
              const isEnabled = !!prayerAlerts[p.key];
              const Icon = p.icon;
              return (
                <div
                  key={p.key}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    isEnabled
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60'
                      : 'bg-stone-50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-800 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isEnabled
                          ? 'bg-emerald-700 text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">
                        {p.nameBn}
                      </span>
                      <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium leading-relaxed">
                        {p.subtitleBn}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
                      {isEnabled ? 'চালু' : 'বন্ধ'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggleSinglePrayer(p.key)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5.5 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Custom Alert Sound Selector */}
        <div className="space-y-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold uppercase tracking-normal text-stone-900 dark:text-stone-100 block">
                অ্যালার্টের সুর ও আজান নির্বাচন
              </span>
              <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium leading-relaxed mt-0.5">
                পছন্দের সুরটি নির্বাচন করুন এবং প্লে বাটনে চাপ দিয়ে শুনুন
              </span>
            </div>
            {playingSoundId && (
              <button
                onClick={() => {
                  soundManager.stopAudio();
                  setPlayingSoundId(null);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-semibold cursor-pointer shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>থামান</span>
              </button>
            )}
          </div>

          {/* Sound Cards Grid */}
          <div className="space-y-2.5">
            {PRAYER_ALERT_SOUND_OPTIONS.map((opt: PrayerAlertSoundOption) => {
              const isSelected = activeSound === opt.id;
              const isPlaying = playingSoundId === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectGlobalSound(opt.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 hover:border-emerald-500/40 bg-stone-50/50 dark:bg-stone-800/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Radio indicator */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center mt-1 shrink-0 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-stone-400 dark:border-stone-500'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 leading-snug">
                          {opt.nameBn}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                            opt.type === 'azan'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200'
                              : opt.type === 'tone'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200'
                          }`}
                        >
                          {opt.badgeBn}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                        {opt.descriptionBn}
                      </p>
                    </div>
                  </div>

                  {/* Audition / Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSoundPreview(opt.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isPlaying
                        ? 'bg-amber-600 text-white shadow-xs animate-pulse'
                        : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                    title={isPlaying ? 'সুর থামান' : 'সুর শুনুন'}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>বাজছে</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>শুনুন</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Advanced: Per-Prayer Custom Sounds Collapsible */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={() => setIsPerPrayerSoundExpanded(!isPerPrayerSoundExpanded)}
            className="w-full flex items-center justify-between text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 py-1.5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>প্রতিটি ওয়াক্তের জন্য আলাদা সুর নির্ধারণ (উন্নত)</span>
            </div>
            {isPerPrayerSoundExpanded ? (
              <ChevronUp className="w-4 h-4 text-stone-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-500" />
            )}
          </button>

          {isPerPrayerSoundExpanded && (
            <div className="mt-3 space-y-2 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200 dark:border-stone-700/60">
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed pb-1 font-medium">
                যেমন: ফজরে মক্কার আজান, যোহরে মদিনার আজান বা আসরে মৃদু চিম নির্ধারণ করতে পারেন।
              </p>

              {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((key) => {
                const assignedSound = customSounds[key] || activeSound;
                const prayerNames: Record<string, string> = {
                  fajr: 'ফজর সালাত',
                  dhuhr: 'যোহর সালাত',
                  asr: 'আসর সালাত',
                  maghrib: 'মাগরিব সালাত',
                  isha: 'এশা সালাত'
                };

                return (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-[#151B22] border border-stone-200 dark:border-stone-700 text-xs sm:text-sm"
                  >
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {prayerNames[key]}
                    </span>

                    <div className="flex items-center gap-2">
                      <select
                        value={assignedSound}
                        onChange={(e) => handleSelectPrayerCustomSound(key, e.target.value as PrayerAlertSound)}
                        className="p-1.5 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600"
                      >
                        {PRAYER_ALERT_SOUND_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.nameBn}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleToggleSoundPreview(assignedSound)}
                        className="p-1.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold cursor-pointer"
                        title="এই সুর শুনুন"
                      >
                        {playingSoundId === assignedSound ? (
                          <Square className="w-3.5 h-3.5 fill-current text-amber-500" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUNNAH FASTING PUSH NOTIFICATIONS (সুন্নাহ রোজার নোটিফিকেশন) */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-emerald-500/30 dark:border-emerald-500/20 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-50 leading-snug">
                সুন্নাহ রোজার পুশ নোটিফিকেশন
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium leading-relaxed mt-0.5">
                হিজরি ক্যালেন্ডার অনুযায়ী আরাফা, আশুরা, আইয়ামে বীজ এবং সোম ও বৃহস্পতিবারের রোজার স্মরণবার্তা
              </p>
            </div>
          </div>

          <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 shrink-0 pt-0.5">
            {isSunnahFastingEnabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
          </span>
        </div>

        {/* Master Toggle & Hijri Calendar Configuration */}
        <div className="space-y-3.5 bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-700/60">
          {/* Master Push Toggle */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BellRing className={`w-5 h-5 shrink-0 ${isSunnahFastingEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'}`} />
              <div>
                <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">
                  সুন্নাহ রোজার পুশ অ্যালার্ট চালু করুন
                </span>
                <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium leading-relaxed block">
                  নির্ধারিত সুন্নাহ রোজার পূর্বে স্বয়ংক্রিয় পুশ নোটিফিকেশন ও সেহরি রিমাইন্ডার পাবেন
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isSunnahFastingEnabled}
                onChange={(e) => handleToggleSunnahFastingMaster(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Reminder Timing Selector */}
          <div className="pt-3 border-t border-stone-200/60 dark:border-stone-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                নোটিফিকেশন পাঠানোর সময়
              </span>
              <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                {sunnahReminderTiming === 'both'
                  ? 'আগের সন্ধ্যা ও সেহরি'
                  : sunnahReminderTiming === 'evening_before'
                  ? 'আগের দিন রাত ৮:০০টা'
                  : 'ফজরের ৪৫ মি. পূর্বে'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {([
                { id: 'both' as const, label: 'উভয় সময়' },
                { id: 'evening_before' as const, label: 'আগের সন্ধ্যায়' },
                { id: 'sehri_morning' as const, label: 'সেহরির সময়' }
              ]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    onUpdateSettings({ sunnahFastingReminderTiming: item.id });
                  }}
                  className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                    sunnahReminderTiming === item.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white dark:bg-[#151B22] border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hijri Calendar Date Adjustment (Moon Sighting Alignment) */}
          <div className="pt-3 border-t border-stone-200/60 dark:border-stone-700/60 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  হিজরি তারিখ ও চাঁদ দেখা সমন্বয়
                </span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                আজ: {currentHijri.formattedBn}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {([-2, -1, 0, 1, 2] as const).map((adj) => {
                const isSelected = (settings.hijriDayAdjustment || 0) === adj;
                const label =
                  adj === 0
                    ? '০ দিন'
                    : adj > 0
                    ? `+${toBengaliDigits(adj)} দিন`
                    : `-${toBengaliDigits(Math.abs(adj))} দিন`;
                return (
                  <button
                    key={adj}
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      onUpdateSettings({ hijriDayAdjustment: adj });
                    }}
                    className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer tabular-nums whitespace-nowrap ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-[#151B22] border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Individual Sunnah Fasting Category Toggles */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
              সুন্নাহ রোজার ক্যাটাগরি নির্বাচন
            </span>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => handleToggleAllSunnahFasts(true)}
                className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                সবগুলো চালু
              </button>
              <span className="text-stone-400 dark:text-stone-600 font-normal">·</span>
              <button
                type="button"
                onClick={() => handleToggleAllSunnahFasts(false)}
                className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
              >
                সবগুলো বন্ধ
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {SUNNAH_FASTING_CATEGORIES.map((cat) => {
              const isEnabled = !!sunnahFastingAlerts[cat.key];
              return (
                <div
                  key={cat.key}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    isEnabled
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60'
                      : 'bg-stone-50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-800 opacity-70'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">
                      {cat.nameBn}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300 font-medium flex-wrap">
                      <span>{cat.hijriRuleBn}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 dark:text-emerald-400">{cat.hadithRef}</span>
                    </div>
                    <p className="text-xs text-stone-700 dark:text-stone-200 leading-relaxed pt-0.5">
                      {cat.virtueBn}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
                      {isEnabled ? 'চালু' : 'বন্ধ'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggleSingleSunnahFast(cat.key)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5.5 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Sunnah Fasting Schedule & Test Button */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 block">
                আসন্ন সুন্নাহ রোজার সময়সূচি (হিজরি ক্যালেন্ডার)
              </span>
              <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                আপনার নির্বাচিত ক্যাটাগরি অনুযায়ী পরবর্তী রোজার দিনসমূহ
              </span>
            </div>

            <button
              type="button"
              onClick={handleSendTestSunnahNotification}
              className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>টেস্ট অ্যালার্ট</span>
            </button>
          </div>

          {sunnahTestBanner && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm text-emerald-900 dark:text-emerald-100 font-medium leading-relaxed">
              {sunnahTestBanner}
            </div>
          )}

          {upcomingSunnahDays.length > 0 ? (
            <div className="divide-y divide-stone-200/70 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/20">
              {upcomingSunnahDays.map((item) => (
                <div key={item.dateKey} className="p-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 block">
                      {item.primaryTitleBn}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300 font-medium flex-wrap tabular-nums">
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">{item.hijriDateBn}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.gregorianDateBn}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0 tabular-nums whitespace-nowrap">
                    {item.daysFromNow === 0
                      ? 'আজ'
                      : item.daysFromNow === 1
                      ? 'আগামীকাল'
                      : `${toBengaliDigits(item.daysFromNow)} দিন পর`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 py-2 font-medium">
              আসন্ন রোজার তালিকা দেখতে উপরের যেকোনো একটি সুন্নাহ রোজার ক্যাটাগরি চালু করুন।
            </p>
          )}
        </div>
      </div>

      {/* 2. Prayer & Location Settings */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-normal text-stone-900 dark:text-stone-100">
          নামাজ গণনা ও অবস্থান
        </h3>

        {/* District */}
        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">নির্বাচিত জেলা / শহর</span>
            <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium">{district.nameBn} ({district.division})</span>
          </div>
          <button
            onClick={onOpenDistrictModal}
            className="text-xs sm:text-sm px-3.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            পরিবর্তন
          </button>
        </div>

        {/* Calculation Method */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-t border-stone-100 dark:border-stone-800 pt-2.5">
          <div>
            <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">নামাজ গণনা পদ্ধতি (Calculation Method)</span>
            <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium">
              {settings.calcMethod === 'karachi' && 'ইসলামিক ফাউন্ডেশন বাংলাদেশ / করাচি (ফজর ১৮°, এশা ১৮°)'}
              {settings.calcMethod === 'mwl' && 'মুসলিম ওয়ার্ল্ড লীগ (MWL - ফজর ১৮°, এশা ১৭°)'}
              {settings.calcMethod === 'makkah' && 'উম্মুল কুরা, মক্কা মুকাররমা (ফজর ১৮.৫°, এশা ৯০ মি.)'}
              {settings.calcMethod === 'egypt' && 'মিশরীয় সার্ভে অথরিটি (ফজর ১৯.৫°, এশা ১৭.৫°)'}
              {settings.calcMethod === 'isna' && 'উত্তর আমেরিকা (ISNA - ফজর ১৫°, এশা ১৫°)'}
            </span>
          </div>

          <select
            value={settings.calcMethod || 'karachi'}
            onChange={(e) => onUpdateSettings({ calcMethod: e.target.value as any })}
            className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 shrink-0"
          >
            <option value="karachi">ইসলামিক ফাউন্ডেশন / করাচি</option>
            <option value="mwl">মুসলিম ওয়ার্ল্ড লীগ (MWL)</option>
            <option value="makkah">উম্মুল কুরা, মক্কা মুকাররমা</option>
            <option value="egypt">মিশরীয় সার্ভে অথরিটি</option>
            <option value="isna">উত্তর আমেরিকা (ISNA)</option>
          </select>
        </div>

        {/* Asr Juristic Method */}
        <div className="flex items-center justify-between py-1 border-t border-stone-100 dark:border-stone-800 pt-2.5">
          <div>
            <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">আসরের গণনা পদ্ধতি</span>
            <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium">
              {settings.juristicMethod === 'hanafi' ? 'হানাফি (২ গুণ ছায়া)' : 'শাফেঈ / অন্যান্য (১ গুণ ছায়া)'}
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
            <button
              onClick={() => onUpdateSettings({ juristicMethod: 'hanafi' })}
              className={`px-3 py-1 text-xs sm:text-sm rounded-md font-bold cursor-pointer transition-colors ${
                settings.juristicMethod === 'hanafi' ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-700 dark:text-stone-200 hover:text-stone-900'
              }`}
            >
              হানাফি
            </button>
            <button
              onClick={() => onUpdateSettings({ juristicMethod: 'shafii' })}
              className={`px-3 py-1 text-xs sm:text-sm rounded-md font-bold cursor-pointer transition-colors ${
                settings.juristicMethod === 'shafii' ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-700 dark:text-stone-200 hover:text-stone-900'
              }`}
            >
              শাফেঈ
            </button>
          </div>
        </div>

        {/* Daily Prayer Goal Setting */}
        <div className="py-2.5 border-t border-stone-100 dark:border-stone-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">
                দৈনিক সালাত লক্ষ্য (Daily Prayer Goal)
              </span>
              <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium">
                হোম স্ক্রিনের প্রগ্রেস রিংয়ে আপনার নির্ধারিত দৈনিক লক্ষ্য প্রদর্শিত হবে
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
              {toBengaliDigits(settings.dailyPrayerGoal || 5)} ওয়াক্ত
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { count: 3, label: '৩ ওয়াক্ত' },
              { count: 4, label: '৪ ওয়াক্ত' },
              { count: 5, label: '৫ ওয়াক্ত (ফরয)' },
              { count: 7, label: '৭ ওয়াক্ত (সুন্নাতসহ)' }
            ].map((g) => (
              <button
                key={g.count}
                onClick={() => {
                  triggerHaptic(20);
                  onUpdateSettings({ dailyPrayerGoal: g.count });
                }}
                className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer text-center ${
                  (settings.dailyPrayerGoal || 5) === g.count
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Quran Reading Settings */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-normal text-stone-900 dark:text-stone-100">
          কুরআন তিলাওয়াত সেটিংস
        </h3>

        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 block leading-snug">আরবি ফন্টের আকার</span>
            <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-medium">সহজে পড়ার উপযোগী সাইজ নির্ধারণ করুন</span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
            {(['normal', 'large', 'xlarge'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => onUpdateSettings({ arabicFontSize: sz })}
                className={`px-3 py-1 text-xs sm:text-sm rounded-md font-bold cursor-pointer transition-colors ${
                  settings.arabicFontSize === sz ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-700 dark:text-stone-200'
                }`}
              >
                {sz === 'normal' ? 'সাধারণ' : sz === 'large' ? 'বড়' : 'অনেক বড়'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. App-wide Font Size / Text Scaling */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                অ্যাপের লেখার আকার (Font Size)
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                অন্যান্য সাধারণ অ্যাপের মতো স্পষ্ট ও স্বাভাবিক পাঠযোগ্য সাইজ
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { id: 'normal' as const, labelBn: 'স্বাভাবিক (Normal)', descBn: 'মানসম্মত সাইজ' },
            { id: 'large' as const, labelBn: 'বড় (Large)', descBn: 'সহজে পড়ার জন্য' },
            { id: 'xlarge' as const, labelBn: 'অনেক বড় (XL)', descBn: 'স্পষ্টতম পাঠ' }
          ].map((item) => {
            const isSelected = (settings.appTextSize || 'normal') === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  triggerHaptic(20);
                  onUpdateSettings({ appTextSize: item.id });
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs ring-1 ring-emerald-500/30'
                    : 'border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/60 font-semibold'
                }`}
              >
                <span className="text-xs sm:text-sm font-bold">{item.labelBn}</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  {item.descBn}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Font Size Sample Box */}
        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/60 space-y-1">
          <span className="text-xs font-bold text-[#177a56] dark:text-emerald-400 block">
            ফন্ট সাইজ নমুনা (Live Preview):
          </span>
          <p className="text-sm font-medium text-stone-800 dark:text-stone-200 leading-relaxed">
            “নামাজের সময় হলে সঠিক সময়ে সালাত আদায় করুন।”
          </p>
        </div>
      </div>

      {/* 4. Theme & Appearance */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-normal text-stone-900 dark:text-stone-100">
          থিম ও প্রদর্শন (Theme)
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              triggerHaptic(20);
              onUpdateSettings({ theme: 'light' });
            }}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              settings.theme === 'light'
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                : 'border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/60 font-semibold'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs sm:text-sm font-bold">লাইট মোড</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(20);
              onUpdateSettings({ theme: 'dark' });
            }}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              settings.theme === 'dark'
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                : 'border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/60 font-semibold'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span className="text-xs sm:text-sm font-bold">ডার্ক মোড</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(20);
              onUpdateSettings({ theme: 'system' });
            }}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              settings.theme === 'system'
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                : 'border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/60 font-semibold'
            }`}
          >
            <Laptop className="w-5 h-5 text-stone-500" />
            <span className="text-xs sm:text-sm font-bold">সিস্টেম</span>
          </button>
        </div>
      </div>

      {/* 5. Privacy & Data Protection Statement */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-2.5 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm sm:text-base">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>ওয়াক্ত ১০০% অফলাইন ও নিরাপদ গোপনীয়তা নীতি</span>
        </div>
        <p className="text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
          আপনার কোনো ব্যক্তিগত আমল, নামাজের রেকর্ড বা নোট দূরবর্তী সার্ভারে প্রেরণ করা হয় না। সমস্ত ডেটা আপনার নিজের ডিভাইসের লোকাল স্টোরেজে সম্পূর্ণ নিরাপদে সংরক্ষিত থাকে।
        </p>

        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            onClick={() => {
              triggerHaptic(30);
              setShowClearConfirm(true);
            }}
            className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>সকল লোকাল ডেটা মুছে ফেলুন</span>
          </button>
        </div>
      </div>

      {/* 6. Exclusive Admin Control Panel Access */}
      <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 border border-emerald-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white">
              অ্যাডমিন কন্ট্রোল প্যানেল (Admin Panel)
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              শুধুমাত্র প্রধান অ্যাডমিন (nafiulislam3810@gmail.com) প্রবেশ করতে পারবেন
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

      {/* Confirmation Modal for Clearing Data */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151B22] rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-rose-200 dark:border-rose-900/40 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-50 leading-snug">
                সকল ডেটা মুছে ফেলতে চান?
              </h3>
              <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                আপনার সমস্ত সংরক্ষিত নোট, বুকমার্ক, কুইজ স্কোর ও আমল ট্র্যাকার হিস্ট্রি স্থায়ীভাবে মুছে যাবে।
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllData}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>হ্যাঁ, মুছুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
