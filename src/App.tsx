/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TabType, MoreSection, UserSettings, District, DailyAmalRecord } from './types';
import { BANGLADESH_DISTRICTS, DEFAULT_DISTRICT } from './data/districts';
import { storage } from './utils/storage';
import { computePrayerTimes, getNextPrayer, toBengaliDigits } from './utils/prayerTimes';
import { evaluateSunnahFastingDay, DEFAULT_SUNNAH_FASTING_TOGGLES, getUpcomingAyyamAlBeedWindow } from './utils/sunnahFasting';
import { soundManager, triggerHaptic, sendNotification, PRAYER_ALERT_SOUND_OPTIONS } from './utils/audio';
import { useSync } from './context/SyncContext';
import { hasLaterPrayerBeenMarked, calculateMissedPrayers } from './utils/amalCheck';
import { AlertCircle, X } from 'lucide-react';

// Components
import { TopHeader } from './components/TopHeader';
import { BottomNav } from './components/BottomNav';
import { HomeDashboard } from './components/HomeDashboard';
import { PrayerTimesView } from './components/PrayerTimesView';
import { QuranReaderView } from './components/QuranReaderView';
import { DuaView } from './components/DuaView';
import { MoreMenuView } from './components/MoreMenuView';
import { TasbihView } from './components/TasbihView';
import { QiblaView } from './components/QiblaView';
import { RamadanView } from './components/RamadanView';
import { QuizView } from './components/QuizView';
import { HadithView } from './components/HadithView';
import { AzkarView } from './components/AzkarView';
import { PrayerGuideView } from './components/PrayerGuideView';
import { HajjGuideView } from './components/HajjGuideView';
import { HajjCountdownView } from './components/HajjCountdownView';
import { ZakatCalculatorView } from './components/ZakatCalculatorView';
import { AmalTrackerView } from './components/AmalTrackerView';
import { NotesView } from './components/NotesView';
import { BookmarksView } from './components/BookmarksView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { AboutView } from './components/AboutView';
import { RankingView } from './components/RankingView';
import { SunnahView } from './components/SunnahView';

// Modals
import { DistrictSelectorModal } from './components/DistrictSelectorModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { DeenNavigatorModal } from './components/DeenNavigatorModal';
import { ShareCardModal } from './components/ShareCardModal';
import { IslamicCalendarRemindersModal } from './components/IslamicCalendarRemindersModal';
import { computeCoinBreakdown } from './utils/coins';
import { BOOTSTRAPPED_SUPER_ADMIN_EMAIL, setStoredBackendAdminToken } from './admin/adminService';

export default function App() {
  // Navigation & Sub-views (Strictly initialize to main app 'home' view on startup)
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeMoreSection, setActiveMoreSection] = useState<MoreSection | null>(null);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number | null>(null);

  // Navigation History Stack (avoids duplicate consecutive entries)
  const historyStackRef = useRef<Array<{ tab: TabType; moreSection: MoreSection | null; surahNumber: number | null }>>([
    { tab: 'home', moreSection: null, surahNumber: null }
  ]);

  // App Settings & Persistence
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());
  
  // Modals state
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isDeenNavigatorOpen, setIsDeenNavigatorOpen] = useState(false);
  const [isCalendarRemindersOpen, setIsCalendarRemindersOpen] = useState(false);
  const [shareCardContent, setShareCardContent] = useState<{
    title: string;
    arabic?: string;
    translation: string;
    reference: string;
  } | null>(null);

  // Live Timer
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Real-time Firestore sync context
  const { user, amalRecords, saveAmalRecord, publishedAnnouncements, prayerSystemConfig } = useSync();

  // Ensure startup navigation never loads an admin route and strictly enforce exclusive admin email check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (
        window.location.hash.toLowerCase().includes('admin') ||
        window.location.pathname.toLowerCase().startsWith('/admin')
      ) {
        try {
          window.history.replaceState(
            { waqtoNav: true, tab: 'home', moreSection: null, surahNumber: null, depth: 1 },
            '',
            '/'
          );
        } catch {}
      }
    }
    setActiveTab('home');
    setActiveMoreSection(null);
    setSelectedSurahNumber(null);
  }, []);

  // Strictly enforce that only 'nafiulislam3810@gmail.com' can hold or initialize an admin session
  useEffect(() => {
    const signedInEmail = user?.email?.trim().toLowerCase();
    if (signedInEmail && signedInEmail !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
      setStoredBackendAdminToken(null);
    }
  }, [user]);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<string[]>([]);
  const activeAnnouncement = useMemo(() => {
    return (publishedAnnouncements || []).find((a) => !dismissedAnnouncementIds.includes(a.id)) || null;
  }, [publishedAnnouncements, dismissedAnnouncementIds]);

  // Today's Amal Tracker Record
  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const currentAmalRecord = useMemo<DailyAmalRecord>(() => {
    return (
      amalRecords[todayKey] || {
        dateKey: todayKey,
        prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
        morningAzkarDone: false,
        eveningAzkarDone: false,
        fastingDone: false,
        sadaqahDone: false,
        tasbihCount: 0
      }
    );
  }, [amalRecords, todayKey]);

  // Track prayer alerts already sent today
  const alertedPrayersRef = useRef<Set<string>>(new Set());

  // Resolve active district
  const district = useMemo<District>(() => {
    if (settings.useGps && settings.gpsCoords) {
      return {
        id: 'gps_custom',
        nameBn: 'বর্তমান অবস্থান (জিপিএস)',
        nameEn: 'Current GPS Location',
        division: 'বাংলাদেশ',
        lat: settings.gpsCoords.lat,
        lng: settings.gpsCoords.lng
      };
    }
    const found = BANGLADESH_DISTRICTS.find((d) => d.id === settings.selectedDistrictId);
    return found || DEFAULT_DISTRICT;
  }, [settings.selectedDistrictId, settings.useGps, settings.gpsCoords]);

  // Compute Prayer Times (combining user personal settings + Admin Panel real-time system configurations)
  const prayers = useMemo(() => {
    const activeJuristic = prayerSystemConfig?.juristicMethod || settings.juristicMethod || 'hanafi';
    const activeCalcMethod = prayerSystemConfig?.calcMethod || settings.calcMethod || 'karachi';
    return computePrayerTimes(
      new Date(),
      district.lat,
      district.lng,
      activeJuristic,
      activeCalcMethod,
      {
        fajr: (settings.fajrOffset || 0) + (prayerSystemConfig?.fajrOffset || 0),
        dhuhr: (settings.dhuhrOffset || 0) + (prayerSystemConfig?.dhuhrOffset || 0),
        asr: (settings.asrOffset || 0) + (prayerSystemConfig?.asrOffset || 0),
        maghrib: (settings.maghribOffset || 0) + (prayerSystemConfig?.maghribOffset || 0),
        isha: (settings.ishaOffset || 0) + (prayerSystemConfig?.ishaOffset || 0)
      },
      (settings.hijriDayAdjustment || 0) + (prayerSystemConfig?.hijriDayAdjustment || 0)
    );
  }, [todayKey, district, settings, prayerSystemConfig]);

  // Next and Current prayer calculations
  const { currentPrayer, nextPrayer } = useMemo(() => {
    return getNextPrayer(prayers, currentTime);
  }, [prayers, currentTime]);

  // Missed prayers for today's record:
  // Only flagged as missed if the current date matches the record date and the prayer time has passed
  const missedPrayers = useMemo(() => {
    return calculateMissedPrayers(currentAmalRecord, prayers, currentTime);
  }, [currentAmalRecord, prayers, currentTime]);

  // 1-second live clock interval & Prayer notification checker
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      
      // Only re-render full App state on home tab where live seconds clock and countdown ring tick
      if (activeTab === 'home') {
        setCurrentTime(now);
      }

      // Check if next prayer is due now (within 60 seconds)
      const { nextPrayer: liveNext } = getNextPrayer(prayers, now);
      if (liveNext && liveNext.remainingMinutes === 0 && liveNext.remainingSeconds < 5) {
        const prayerKey = `${todayKey}_${liveNext.nameKey}`;
        if (!alertedPrayersRef.current.has(prayerKey)) {
          alertedPrayersRef.current.add(prayerKey);

          // Check if individual prayer alert is enabled
          const prayerNameKey = liveNext.nameKey as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
          const isPrayerEnabled = settings.prayerAlerts ? settings.prayerAlerts[prayerNameKey] !== false : true;

          const chosenSound = settings.prayerCustomSounds?.[prayerNameKey] || settings.prayerAlertSound || 'azan_makkah';

          if (settings.soundEnabled && isPrayerEnabled) {
            soundManager.playPrayerAlert(chosenSound);
          }
          if (settings.vibrateEnabled && isPrayerEnabled) {
            triggerHaptic([100, 50, 100]);
          }
          if (settings.notificationsEnabled && isPrayerEnabled) {
            const soundOpt = PRAYER_ALERT_SOUND_OPTIONS.find((o) => o.id === chosenSound);
            const azanName = soundOpt?.nameBn || 'পূর্ণাঙ্গ আজান';
            sendNotification(
              `ওয়াক্ত হয়েছে — ${liveNext.nameBn} (${liveNext.timeStr})`,
              `${district.nameBn}-এ এখন ${liveNext.nameBn} নামাজের সময় হয়েছে। আজান: ${azanName}। “হাইয়া আলাস-সালাহ — নামাজের দিকে এসো।”`
            );
          }
        }
      }

      // Check 10-minute early reminder
      if (settings.remind10MinBefore && liveNext && liveNext.remainingMinutes === 10 && liveNext.remainingSeconds < 5) {
        const earlyKey = `${todayKey}_${liveNext.nameKey}_early10`;
        if (!alertedPrayersRef.current.has(earlyKey)) {
          alertedPrayersRef.current.add(earlyKey);
          const prayerNameKey = liveNext.nameKey as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
          const isPrayerEnabled = settings.prayerAlerts ? settings.prayerAlerts[prayerNameKey] !== false : true;

          if (isPrayerEnabled) {
            soundManager.playSoftBeep();
            if (settings.vibrateEnabled) triggerHaptic(40);
            sendNotification(
              `আগাম সতর্কতা — ${liveNext.nameBn} আর ১০ মিনিট বাকি`,
              `${district.nameBn}-এ আর ১০ মিনিট পর ${liveNext.nameBn} ওয়াক্ত শুরু হবে। নামাজের প্রস্তুতি নিন।`
            );
          }
        }
      }

      // Check Hijri-based Sunnah Fasting Push Notifications
      if (settings.sunnahFastingNotificationsEnabled) {
        const sunnahToggles = {
          ...DEFAULT_SUNNAH_FASTING_TOGGLES,
          ...(settings.sunnahFastingAlerts || {})
        };
        const timingPref = settings.sunnahFastingReminderTiming || 'both';
        const hijriAdj = settings.hijriDayAdjustment || 0;

        // 1. Evening Before Reminder (8:00 PM for tomorrow's Sunnah Fast)
        if ((timingPref === 'evening_before' || timingPref === 'both') && now.getHours() === 20 && now.getMinutes() === 0 && now.getSeconds() < 5) {
          const eveningFastKey = `${todayKey}_sunnah_fast_evening`;
          if (!alertedPrayersRef.current.has(eveningFastKey)) {
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const tomorrowFast = evaluateSunnahFastingDay(tomorrow, hijriAdj, sunnahToggles, 1);
            if (tomorrowFast) {
              alertedPrayersRef.current.add(eveningFastKey);
              if (settings.soundEnabled) soundManager.playPrayerChime();
              if (settings.vibrateEnabled) triggerHaptic([80, 40, 80]);
              if (tomorrowFast.matchedKeys.includes('ayyamAlBeed') && tomorrowFast.hijriDay === 13) {
                const ayyamWin = getUpcomingAyyamAlBeedWindow(now, hijriAdj);
                sendNotification('আইয়ামে বীজের রোজা', ayyamWin.messageBn);
              } else {
                sendNotification(
                  `আগামীকাল সুন্নাহ রোজা — ${tomorrowFast.primaryTitleBn}`,
                  `আগামীকাল (${tomorrowFast.hijriDateBn}) ${tomorrowFast.primaryTitleBn}। সেহরির শেষ সময় (ফজর): ${toBengaliDigits(prayers.fajr)}। ${tomorrowFast.virtueBn}`
                );
              }
            }
          }
        }

        // 2. Sehri Morning Reminder (45 minutes before Fajr on the day of Sunnah Fast)
        if (
          (timingPref === 'sehri_morning' || timingPref === 'both') &&
          liveNext &&
          liveNext.nameKey === 'fajr' &&
          liveNext.remainingMinutes === 45 &&
          liveNext.remainingSeconds < 5
        ) {
          const sehriFastKey = `${todayKey}_sunnah_fast_sehri`;
          if (!alertedPrayersRef.current.has(sehriFastKey)) {
            const todayFast = evaluateSunnahFastingDay(now, hijriAdj, sunnahToggles, 0);
            if (todayFast) {
              alertedPrayersRef.current.add(sehriFastKey);
              if (settings.soundEnabled) soundManager.playPrayerChime();
              if (settings.vibrateEnabled) triggerHaptic([100, 50, 100]);
              sendNotification(
                `সেহরির সময় চলছে — আজ ${todayFast.primaryTitleBn}`,
                `আজ (${todayFast.hijriDateBn}) ${todayFast.primaryTitleBn}। সেহরির শেষ সময় (ফজর): ${toBengaliDigits(prayers.fajr)}। নিয়ত করে সেহরি সম্পন্ন করুন।`
              );
            }
          }
        }
      }
    }, 1000);

    const handleSyncOnResume = () => {
      if (document.visibilityState === 'visible') {
        setCurrentTime(new Date());
      }
    };
    document.addEventListener('visibilitychange', handleSyncOnResume);
    window.addEventListener('focus', handleSyncOnResume);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleSyncOnResume);
      window.removeEventListener('focus', handleSyncOnResume);
    };
  }, [prayers, todayKey, district.nameBn, settings, activeTab]);

  // Theme & App Text Scale application
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme(settings.theme);

    // Dynamic App-wide font scaling class
    const textSize = settings.appTextSize || 'normal';
    root.classList.remove('text-scale-normal', 'text-scale-large', 'text-scale-xlarge');
    root.classList.add(`text-scale-${textSize}`);

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme, settings.appTextSize]);

  // Handle settings update
  const handleUpdateSettings = (newPartial: Partial<UserSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
    storage.saveSettings(updated);
  };

  // Handle GPS location trigger
  const handleUseGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleUpdateSettings({
            useGps: true,
            gpsCoords: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            }
          });
          setIsDistrictModalOpen(false);
          triggerHaptic(30);
        },
        () => {
          alert('জিপিএস লোকেশন পাওয়া যায়নি। অনুগ্রহ করে ম্যানুয়ালি জেলা নির্বাচন করুন।');
        }
      );
    } else {
      alert('আপনার ডিভাইসে জিপিএস সমর্থিত নয়।');
    }
  };

  // Toast notification for locked prayer
  const [lockedPrayerToast, setLockedPrayerToast] = useState<string | null>(null);

  const showLockedPrayerToast = (msg: string) => {
    setLockedPrayerToast(msg);
    setTimeout(() => setLockedPrayerToast(null), 3200);
  };

  // Toggle Amal prayer
  const handleToggleAmalPrayer = (prayerKey: keyof DailyAmalRecord['prayers']) => {
    const isCurrentlyDone = !!currentAmalRecord.prayers[prayerKey];

    // If attempting to mark an uncompleted prayer as done, but a subsequent waqt was already marked done:
    if (!isCurrentlyDone && hasLaterPrayerBeenMarked(prayerKey, currentAmalRecord.prayers)) {
      triggerHaptic([70, 50, 70]);
      showLockedPrayerToast('পরবর্তী ওয়াক্তের সালাত আদায় চিহ্নিত করায় পূর্বের সালাতটি আর চিহ্নিত করা যাবে না');
      return;
    }

    // Also prevent unmarking a prior prayer if a subsequent waqt is marked done:
    if (isCurrentlyDone && hasLaterPrayerBeenMarked(prayerKey, currentAmalRecord.prayers)) {
      triggerHaptic([70, 50, 70]);
      showLockedPrayerToast('পরবর্তী ওয়াক্তের সালাত আদায় থাকায় পূর্বের আদায়কৃত সালাত পরিবর্তন করা যাবে না');
      return;
    }

    triggerHaptic(20);
    const updated = {
      ...currentAmalRecord,
      prayers: {
        ...currentAmalRecord.prayers,
        [prayerKey]: !isCurrentlyDone
      }
    };
    saveAmalRecord(updated);
  };

  // Toggle general Amal field
  const handleToggleAmalField = (
    field: 'morningAzkarDone' | 'eveningAzkarDone' | 'fastingDone' | 'sadaqahDone' | 'sunnahDone' | 'duaDone' | 'quizDone'
  ) => {
    triggerHaptic(20);
    const updated = {
      ...currentAmalRecord,
      [field]: !currentAmalRecord[field]
    };
    saveAmalRecord(updated);
  };

  // Compute live streak days and total points (Hasanah coins)
  const { streakDays, totalPoints } = useMemo(() => {
    const quizStats = storage.getQuizStats();
    const rozaStats = storage.getRozaTracker();
    const breakdown = computeCoinBreakdown(amalRecords, quizStats, rozaStats);

    const daysWithAmal = new Set<string>();
    Object.values(amalRecords).forEach((rec) => {
      let dayHasAmal = false;
      if (rec.prayers && Object.values(rec.prayers).some(Boolean)) dayHasAmal = true;
      if (rec.morningAzkarDone || rec.eveningAzkarDone || rec.fastingDone || rec.sadaqahDone) dayHasAmal = true;
      if (rec.sunnahDone || rec.duaDone || rec.quizDone || (rec.tasbihCount && rec.tasbihCount > 0)) dayHasAmal = true;
      if (dayHasAmal) {
        daysWithAmal.add(rec.dateKey);
      }
    });

    const streak = Math.max(1, daysWithAmal.size);
    return { streakDays: streak, totalPoints: breakdown.totalCoins };
  }, [amalRecords]);

  // Comprehensive instant scroll reset to top
  const resetScrollToTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    const rootEl = document.getElementById('root');
    if (rootEl) rootEl.scrollTop = 0;
    const scrollables = document.querySelectorAll('.overflow-y-auto, .overflow-y-scroll');
    scrollables.forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
  };

  // Guarantee scroll position is 0 whenever screen/sub-screen/surah changes
  useEffect(() => {
    resetScrollToTop();
    const rId = requestAnimationFrame(() => {
      resetScrollToTop();
    });
    const tId = setTimeout(() => {
      resetScrollToTop();
    }, 20);
    return () => {
      cancelAnimationFrame(rId);
      clearTimeout(tId);
    };
  }, [activeTab, activeMoreSection, selectedSurahNumber]);

  // Forward Navigation with History Tracking
  const navigateTo = (
    tab: TabType,
    moreSection: MoreSection | null = null,
    surahNumber: number | null = null
  ) => {
    triggerHaptic(15);
    const last = historyStackRef.current[historyStackRef.current.length - 1];

    // Prevent duplicate consecutive entries
    if (
      last &&
      last.tab === tab &&
      last.moreSection === moreSection &&
      (last.surahNumber || null) === (surahNumber || null)
    ) {
      resetScrollToTop();
      return;
    }

    if (tab === 'home' && moreSection === null && surahNumber === null) {
      historyStackRef.current = [{ tab: 'home', moreSection: null, surahNumber: null }];
    } else {
      historyStackRef.current.push({ tab, moreSection, surahNumber });
      try {
        window.history.pushState(
          { waqtoNav: true, tab, moreSection, surahNumber, depth: historyStackRef.current.length },
          ''
        );
      } catch (e) {}
    }

    if (tab === 'home') {
      setCurrentTime(new Date());
    }

    setActiveTab(tab);
    setActiveMoreSection(moreSection);
    setSelectedSurahNumber(surahNumber);
    resetScrollToTop();
  };

  // Tab switch wrapper
  const handleTabChange = (tab: TabType) => {
    navigateTo(tab, null, null);
  };

  // Open specific "More" feature
  const handleOpenMoreSection = (section: MoreSection) => {
    navigateTo('more', section, null);
  };

  // Select Surah in Quran reader
  const handleSelectSurah = (num: number | null) => {
    if (num !== null) {
      navigateTo('quran', null, num);
    } else {
      setSelectedSurahNumber(null);
      const last = historyStackRef.current[historyStackRef.current.length - 1];
      if (last && last.surahNumber) {
        historyStackRef.current.pop();
      }
      resetScrollToTop();
    }
  };

  // Unified Android Back & Navigation Pop handler
  const handleGoBack = (): boolean => {
    // 1. Modals: dismiss open modal first
    if (shareCardContent) {
      setShareCardContent(null);
      return true;
    }
    if (isCalendarRemindersOpen) {
      setIsCalendarRemindersOpen(false);
      return true;
    }
    if (isDeenNavigatorOpen) {
      setIsDeenNavigatorOpen(false);
      return true;
    }
    if (isSearchModalOpen) {
      setIsSearchModalOpen(false);
      return true;
    }
    if (isDistrictModalOpen) {
      setIsDistrictModalOpen(false);
      return true;
    }

    // 2. Surah reading view: return to Surah directory
    if (activeTab === 'quran' && selectedSurahNumber !== null) {
      setSelectedSurahNumber(null);
      const last = historyStackRef.current[historyStackRef.current.length - 1];
      if (last && last.surahNumber) {
        historyStackRef.current.pop();
      }
      resetScrollToTop();
      return true;
    }

    // 3. Navigation Stack: pop to previous screen
    if (historyStackRef.current.length > 1) {
      historyStackRef.current.pop();
      const prev = historyStackRef.current[historyStackRef.current.length - 1];
      setActiveTab(prev.tab);
      setActiveMoreSection(prev.moreSection);
      setSelectedSurahNumber(prev.surahNumber || null);
      resetScrollToTop();
      return true;
    }

    // 4. If on a non-home tab or section, return to Home
    if (activeTab !== 'home' || activeMoreSection !== null) {
      setActiveTab('home');
      setActiveMoreSection(null);
      setSelectedSurahNumber(null);
      historyStackRef.current = [{ tab: 'home', moreSection: null, surahNumber: null }];
      resetScrollToTop();
      return true;
    }

    return false;
  };

  // Trigger Go Back (synchronizes with window.history if available)
  const triggerGoBack = () => {
    triggerHaptic(15);
    if (window.history.state?.waqtoNav || window.history.state?.waqtoModal) {
      window.history.back();
    } else {
      handleGoBack();
    }
  };

  // Browser / Android Gesture Popstate sync
  useEffect(() => {
    const onPopState = () => {
      handleGoBack();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [
    shareCardContent,
    isDeenNavigatorOpen,
    isSearchModalOpen,
    isDistrictModalOpen,
    activeTab,
    activeMoreSection,
    selectedSurahNumber
  ]);

  // Native Android Capacitor hardware back button handling
  useEffect(() => {
    let removeListener: (() => void) | null = null;
    import('@capacitor/app')
      .then(({ App: CapApp }) => {
        CapApp.addListener('backButton', () => {
          const canAppGoBack =
            !!shareCardContent ||
            isDeenNavigatorOpen ||
            isSearchModalOpen ||
            isDistrictModalOpen ||
            (activeTab === 'quran' && selectedSurahNumber !== null) ||
            activeMoreSection !== null ||
            activeTab !== 'home' ||
            historyStackRef.current.length > 1;

          if (canAppGoBack) {
            triggerGoBack();
          } else {
            CapApp.exitApp();
          }
        }).then((handle) => {
          removeListener = () => handle.remove();
        });
      })
      .catch(() => {});

    return () => {
      if (removeListener) removeListener();
    };
  }, [
    shareCardContent,
    isDeenNavigatorOpen,
    isSearchModalOpen,
    isDistrictModalOpen,
    activeTab,
    activeMoreSection,
    selectedSurahNumber
  ]);

  // Modal open helpers with history state
  const handleOpenDistrictModal = () => {
    setIsDistrictModalOpen(true);
    try {
      window.history.pushState({ waqtoModal: 'district' }, '');
    } catch (e) {}
  };
  const handleCloseDistrictModal = () => {
    setIsDistrictModalOpen(false);
    if (window.history.state?.waqtoModal === 'district') {
      window.history.back();
    }
  };

  const handleOpenSearchModal = () => {
    setIsSearchModalOpen(true);
    try {
      window.history.pushState({ waqtoModal: 'search' }, '');
    } catch (e) {}
  };
  const handleCloseSearchModal = () => {
    setIsSearchModalOpen(false);
    if (window.history.state?.waqtoModal === 'search') {
      window.history.back();
    }
  };

  const handleOpenDeenNavigator = () => {
    setIsDeenNavigatorOpen(true);
    try {
      window.history.pushState({ waqtoModal: 'navigator' }, '');
    } catch (e) {}
  };
  const handleCloseDeenNavigator = () => {
    setIsDeenNavigatorOpen(false);
    if (window.history.state?.waqtoModal === 'navigator') {
      window.history.back();
    }
  };

  const handleOpenCalendarReminders = () => {
    setIsCalendarRemindersOpen(true);
    try {
      window.history.pushState({ waqtoModal: 'calendar_reminders' }, '');
    } catch (e) {}
  };
  const handleCloseCalendarReminders = () => {
    setIsCalendarRemindersOpen(false);
    if (window.history.state?.waqtoModal === 'calendar_reminders') {
      window.history.back();
    }
  };

  const handleOpenShareCard = (content: { title: string; arabic?: string; translation: string; reference: string }) => {
    setShareCardContent(content);
    try {
      window.history.pushState({ waqtoModal: 'share' }, '');
    } catch (e) {}
  };
  const handleCloseShareCard = () => {
    setShareCardContent(null);
    if (window.history.state?.waqtoModal === 'share') {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f7faf8] dark:bg-[#0c120f] text-stone-900 dark:text-stone-100 flex flex-col selection:bg-emerald-200 selection:text-emerald-950 font-bengali w-full overflow-x-clip">
      {/* 1. Universal Top Header Contract (Fixed top header, stays pinned on scroll) */}
      <TopHeader
        district={district}
        settings={settings}
        streakDays={streakDays}
        totalPoints={totalPoints}
        onOpenDistrictModal={handleOpenDistrictModal}
        onOpenSearch={handleOpenSearchModal}
        onOpenDeenNavigator={handleOpenDeenNavigator}
        onOpenCalendarReminders={handleOpenCalendarReminders}
        onToggleSound={() => handleUpdateSettings({ soundEnabled: !settings.soundEnabled })}
        onOpenQibla={() => handleOpenMoreSection('qibla')}
        onNavigateToProfile={() => handleOpenMoreSection('profile')}
        onNavigateToRanking={() => handleOpenMoreSection('ranking')}
      />

      {/* Fixed Header Height Offset Spacer */}
      <div className="h-16 sm:h-18 pt-[env(safe-area-inset-top,0px)] shrink-0 select-none pointer-events-none" aria-hidden="true" />

      {/* 2. Main Content Area */}
      <main className="flex-1 w-full pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))]">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <HomeDashboard
            district={district}
            prayers={prayers}
            nextPrayer={nextPrayer}
            currentPrayer={currentPrayer}
            currentTime={currentTime}
            amalRecord={currentAmalRecord}
            streakDays={streakDays}
            totalPoints={totalPoints}
            userName={settings.userName}
            dailyPrayerGoal={settings.dailyPrayerGoal || 5}
            onUpdateDailyGoal={(goal: number) => handleUpdateSettings({ dailyPrayerGoal: goal })}
            onToggleAmalPrayer={handleToggleAmalPrayer}
            onToggleAmalField={handleToggleAmalField}
            onNavigateTab={handleTabChange}
            onOpenMoreSection={handleOpenMoreSection}
            onOpenDeenNavigator={() => setIsDeenNavigatorOpen(true)}
            onOpenCalendarReminders={handleOpenCalendarReminders}
            onOpenShareModal={(c) => setShareCardContent(c)}
            missedPrayers={missedPrayers}
            hijriDayAdjustment={(settings.hijriDayAdjustment || 0) + (prayerSystemConfig?.hijriDayAdjustment || 0)}
          />
        )}

        {/* TAB 2: PRAYER TIMES */}
        {activeTab === 'prayers' && (
          <PrayerTimesView
            district={district}
            prayers={prayers}
            nextPrayer={nextPrayer}
            currentPrayer={currentPrayer}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenDistrictModal={() => setIsDistrictModalOpen(true)}
          />
        )}

        {/* TAB 3: AMAL TRACKER */}
        {activeTab === 'amal' && (
          <AmalTrackerView
            currentRecord={currentAmalRecord}
            onUpdateRecord={saveAmalRecord}
            prayers={prayers}
            currentTime={currentTime}
            onNavigateSection={handleOpenMoreSection}
            calculateMissedPrayers={calculateMissedPrayers}
          />
        )}

        {/* TAB 4: QURAN */}
        {activeTab === 'quran' && (
          <QuranReaderView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenShareModal={(c) => handleOpenShareCard(c)}
            selectedSurahNumber={selectedSurahNumber}
            onSelectSurah={handleSelectSurah}
          />
        )}

        {/* TAB 5: DUAS (accessible via Explore or direct) */}
        {activeTab === 'duas' && (
          <DuaView
            onOpenShareModal={(c) => handleOpenShareCard(c)}
          />
        )}

        {/* TAB 6: MORE MENU & SUB-VIEWS */}
        {activeTab === 'more' && (
          <>
            {activeMoreSection === null && (
              <MoreMenuView 
                onSelectSection={setActiveMoreSection}
                streakDays={streakDays}
                totalPoints={totalPoints}
                userName={settings.userName}
              />
            )}

            {/* Sub-view: Tasbih */}
            {activeMoreSection === 'tasbih' && (
              <TasbihView onBack={triggerGoBack} />
            )}

            {/* Sub-view: Qibla */}
            {activeMoreSection === 'qibla' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <QiblaView
                  district={district}
                  onOpenDistrictModal={handleOpenDistrictModal}
                  gpsCoords={settings.gpsCoords}
                  onUpdateGpsCoords={(coords) => {
                    handleUpdateSettings({ gpsCoords: coords });
                  }}
                />
              </div>
            )}

            {/* Sub-view: Ramadan */}
            {activeMoreSection === 'ramadan' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <RamadanView
                  district={district}
                  prayers={prayers}
                  settings={settings}
                />
              </div>
            )}

            {/* Sub-view: Quiz */}
            {activeMoreSection === 'quiz' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <QuizView />
              </div>
            )}

            {/* Sub-view: Hadith */}
            {activeMoreSection === 'hadith' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <HadithView onOpenShareModal={(c) => handleOpenShareCard(c)} />
              </div>
            )}

            {/* Sub-view: Sunnah Hub */}
            {activeMoreSection === 'sunnah' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <SunnahView
                  onBack={triggerGoBack}
                  onOpenShareModal={(c) => handleOpenShareCard(c)}
                />
              </div>
            )}

            {/* Sub-view: Morning/Evening Azkar */}
            {activeMoreSection === 'azkar' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <AzkarView />
              </div>
            )}

            {/* Sub-view: Prayer & Wudu Guide */}
            {activeMoreSection === 'prayer_guide' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <PrayerGuideView />
              </div>
            )}

            {/* Sub-view: Hajj & Umrah */}
            {activeMoreSection === 'hajj_guide' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <HajjGuideView
                  onOpenHajjCountdown={() => handleOpenMoreSection('hajj_countdown')}
                />
              </div>
            )}

            {/* Sub-view: Hajj Season Countdown */}
            {activeMoreSection === 'hajj_countdown' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <HajjCountdownView
                  settings={settings}
                  hijriAdjustment={(settings.hijriDayAdjustment || 0) + (prayerSystemConfig?.hijriDayAdjustment || 0)}
                  onOpenHajjGuide={() => handleOpenMoreSection('hajj_guide')}
                />
              </div>
            )}

            {/* Sub-view: Zakat Calculator */}
            {activeMoreSection === 'zakat' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <ZakatCalculatorView />
              </div>
            )}

            {/* Sub-view: Amal Tracker */}
            {activeMoreSection === 'tracker' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <AmalTrackerView
                  currentRecord={currentAmalRecord}
                  onUpdateRecord={saveAmalRecord}
                  prayers={prayers}
                  currentTime={currentTime}
                  onNavigateSection={handleOpenMoreSection}
                  calculateMissedPrayers={calculateMissedPrayers}
                />
              </div>
            )}

            {/* Sub-view: Personal Notes */}
            {activeMoreSection === 'notes' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <NotesView />
              </div>
            )}

            {/* Sub-view: Bookmarks */}
            {activeMoreSection === 'bookmarks' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <BookmarksView />
              </div>
            )}

            {/* Sub-view: Settings */}
            {activeMoreSection === 'settings' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <SettingsView
                  settings={settings}
                  district={district}
                  onUpdateSettings={handleUpdateSettings}
                  onOpenDistrictModal={handleOpenDistrictModal}
                  onNavigateSection={(sec) => handleOpenMoreSection(sec)}
                />
              </div>
            )}

            {/* Sub-view: Profile */}
            {activeMoreSection === 'profile' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <ProfileView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onNavigateSection={(sec) => handleOpenMoreSection(sec)}
                />
              </div>
            )}

            {/* Sub-view: Ranking */}
            {activeMoreSection === 'ranking' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <RankingView
                  onNavigateSection={(sec) => handleOpenMoreSection(sec as MoreSection)}
                />
              </div>
            )}

            {/* Sub-view: About */}
            {activeMoreSection === 'about' && (
              <div>
                <div className="max-w-xl mx-auto px-4 pt-3">
                  <button
                    onClick={triggerGoBack}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mb-2 cursor-pointer flex items-center gap-1"
                  >
                    ← মেনুতে ফিরে যান
                  </button>
                </div>
                <AboutView />
              </div>
            )}
          </>
        )}
      </main>

      {/* 3. Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Floating Published App Announcement Toast */}
      {activeAnnouncement && !lockedPrayerToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] bg-[#177a56] dark:bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-400/40 flex items-start gap-3 animate-fade-in pointer-events-auto">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold leading-snug">{activeAnnouncement.titleBn}</p>
            <p className="text-[11px] text-emerald-50/90 leading-snug mt-0.5">{activeAnnouncement.messageBn}</p>
          </div>
          <button
            onClick={() => setDismissedAnnouncementIds((prev) => [...prev, activeAnnouncement.id])}
            className="p-1 hover:bg-white/20 rounded-lg shrink-0 cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Floating Locked Prayer Toast Alert */}
      {lockedPrayerToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] bg-rose-600 dark:bg-rose-700 text-white px-4 py-3 rounded-2xl shadow-2xl border border-rose-400/60 flex items-center gap-3 animate-fade-in pointer-events-auto">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <p className="text-xs font-bold leading-snug flex-1">
            {lockedPrayerToast}
          </p>
          <button
            onClick={() => setLockedPrayerToast(null)}
            className="p-1 hover:bg-white/20 rounded-lg shrink-0 cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* 4. Modals & Sheets */}
      <DistrictSelectorModal
        isOpen={isDistrictModalOpen}
        onClose={handleCloseDistrictModal}
        selectedDistrict={district}
        onSelectDistrict={(d) => {
          handleUpdateSettings({
            selectedDistrictId: d.id,
            useGps: false
          });
        }}
        onUseGps={handleUseGps}
      />

      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={handleCloseSearchModal}
        onNavigateToSurah={(num) => {
          handleCloseSearchModal();
          navigateTo('quran', null, num);
        }}
        onNavigateToTab={(tab) => {
          handleCloseSearchModal();
          navigateTo(tab);
        }}
        onNavigateToSection={(sec) => {
          handleCloseSearchModal();
          handleOpenMoreSection(sec as MoreSection);
        }}
      />

      <DeenNavigatorModal
        isOpen={isDeenNavigatorOpen}
        onClose={handleCloseDeenNavigator}
        onNavigateToTab={(tab) => {
          handleCloseDeenNavigator();
          handleTabChange(tab);
        }}
      />

      <ShareCardModal
        isOpen={!!shareCardContent}
        onClose={handleCloseShareCard}
        content={shareCardContent}
      />

      <IslamicCalendarRemindersModal
        isOpen={isCalendarRemindersOpen}
        onClose={handleCloseCalendarReminders}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
