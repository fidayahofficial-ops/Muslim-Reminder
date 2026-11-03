// Audio and notification utility for WAQTO
import { PrayerAlertSound } from '../types';

export interface PrayerAlertSoundOption {
  id: PrayerAlertSound;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  type: 'azan' | 'tone' | 'silent';
  badgeBn: string;
}

export const PRAYER_ALERT_SOUND_OPTIONS: PrayerAlertSoundOption[] = [
  {
    id: 'azan_makkah',
    nameBn: 'মক্কা শরিফের আজান',
    nameEn: 'Makkah Al-Mukarramah',
    descriptionBn: 'মসজিদুল হারামের বিশ্বখ্যাত প্রধান মুয়াজ্জিন শায়খ আলী আহমাদ মোল্লার হৃদয়স্পর্শী আজান',
    type: 'azan',
    badgeBn: 'মসজিদুল হারাম'
  },
  {
    id: 'azan_madinah',
    nameBn: 'মদিনা শরিফের আজান',
    nameEn: 'Madinah Al-Munawwarah',
    descriptionBn: 'মসজিদুন নববির হৃদয়গ্রাহী ও প্রশান্তিময় পূর্ণাঙ্গ আজান',
    type: 'azan',
    badgeBn: 'মসজিদুন নববি'
  },
  {
    id: 'azan_mishary',
    nameBn: 'কারী মিশারি রাশিদ আল-আফাসি',
    nameEn: 'Mishary Rashid Alafasy',
    descriptionBn: 'বিশ্ববিখ্যাত সুমিষ্ট সুরের সুস্পষ্ট ও প্রখ্যাত আজান',
    type: 'azan',
    badgeBn: 'সুমিষ্ট সুর'
  },
  {
    id: 'azan_aqsa',
    nameBn: 'মসজিদুল আকসার আজান',
    nameEn: 'Masjid Al-Aqsa, Jerusalem',
    descriptionBn: 'পবিত্র বায়তুল মুকাদ্দাস / মসজিদুল আকসার ঐতিহ্যবাহী আজান',
    type: 'azan',
    badgeBn: 'আল-আকসা'
  },
  {
    id: 'azan_fajr',
    nameBn: 'মধুর ফজরের আজান',
    nameEn: 'Fajr Special (Alafasy)',
    descriptionBn: '“আস-সালাতু খাইরুম মিনান নাওম” সমৃদ্ধ ফজরের পূর্ণাঙ্গ বিশেষ আজান',
    type: 'azan',
    badgeBn: 'ফজর বিশেষ'
  },
  {
    id: 'chime_gentle',
    nameBn: 'কোমল ইসলামিক কাইম',
    nameEn: 'Serene Prayer Chime',
    descriptionBn: 'হারমোনিক জেন্টল বেল টোন (অফলাইন ও নিরবচ্ছিন্ন)',
    type: 'tone',
    badgeBn: 'অফলাইন'
  },
  {
    id: 'beep_soft',
    nameBn: 'মৃদু অ্যালার্ট বীপ',
    nameEn: 'Soft Notification Beep',
    descriptionBn: 'হালকা দ্বৈত নোটিফিকেশন টোন (অফিস বা ক্লাসের জন্য উপযুক্ত)',
    type: 'tone',
    badgeBn: 'অফিস মোড'
  },
  {
    id: 'vibrate_only',
    nameBn: 'শুধুমাত্র ভাইব্রেশন',
    nameEn: 'Vibrate Only',
    descriptionBn: 'কোনো সাউন্ড বাজবে না, কেবল মৃদু হ্যাপটিক কম্পন অনুভূত হবে',
    type: 'silent',
    badgeBn: 'নীরব'
  }
];

// Fallback high-reliability CDN URLs in case local audio requires fallback
const AZAN_FALLBACK_URLS: Record<string, string> = {
  azan_makkah: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Ali_Ibn_Ahmad_Mala_6_-_Al_Haram_Al_Maki_(%D8%B9%D9%84%D9%8A_%D8%A8%D9%86_%D8%A3%D8%AD%D9%85%D8%AF_%D9%85%D9%84%D8%A7_-_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D9%83%D9%8A).mp3',
  azan_madinah: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Adhan_Al_Haram_Al_Madani_-_Al_Madinah_1_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D8%AF%D9%86%D9%8A_-_%D8%A7%D9%84%D9%85%D8%AF%D9%8A%D9%86%D8%A9_%D8%A7%D9%84%D9%85%D9%86%D9%88%D8%B1%D8%A9).mp3',
  azan_mishary: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Mishary_Rashid_Alafasy_1_-_Kuwait_(%D9%85%D8%B4%D8%A7%D8%B1%D9%8A_%D8%B1%D8%A7%D8%B4%D8%AF_%D8%A7%D9%84%D8%B9%D9%81%D8%A7%D8%B3%D9%8A_-_%D8%A7%D9%84%D9%83%D9%88%D9%8A%D8%AA).mp3',
  azan_aqsa: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Najee_Qazaz_-_Al_Aqsa_Jerusalem_(%D9%86%D8%A7%D8%AC%D9%8A_%D9%82%D8%B2%D8%A7%D8%B2_-_%D8%A7%D9%84%D9%85%D8%B3%D8%AC%D8%AF_%D8%A7%D9%84%D8%A3%D9%82%D8%B5%D9%89_%D8%A7%D9%84%D9%82%D8%AF%D8%B3).mp3',
  azan_fajr: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Mishary_Rashid_Alafasy_3_-_Fajr_Kuwait_(%D9%85%D8%B4%D8%A7%D8%B1%D9%8A_%D8%B1%D8%A7%D8%B4%D8%AF_%D8%A7%D9%84%D8%B9%D9%81%D8%A7%D8%B3%D9%8A_-_%D9%81%D8%AC%D8%B1_%D8%A7%D9%84%D9%83%D9%88%D9%8A%D8%AA).mp3'
};

class SoundController {
  private audioCtx: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private activeSoundId: string | null = null;
  private playbackRate: number = 1;
  private listeners: Set<(soundId: string | null) => void> = new Set();

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Subscribe to playback state changes
  subscribe(listener: (soundId: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(soundId: string | null) {
    this.activeSoundId = soundId;
    this.listeners.forEach((fn) => {
      try {
        fn(soundId);
      } catch {}
    });
  }

  // Soft tactile click for Tasbih
  playTasbihClick(frequency: number = 880) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency / 2, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // AudioContext not allowed or disabled
    }
  }

  // Serene chime tone for prayer time alert (works 100% offline)
  playPrayerChime() {
    try {
      const ctx = this.getContext();
      const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.2);

        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.2 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.2);
        osc.stop(ctx.currentTime + idx * 0.2 + 0.8);
      });
    } catch {
      // AudioContext not allowed
    }
  }

  // Soft double electronic beep (works 100% offline)
  playSoftBeep() {
    try {
      const ctx = this.getContext();
      const beeps = [784, 988]; // G5, B5 notes
      beeps.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.14;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.12);
      });
    } catch {}
  }

  // Play real full prayer alert sound or Azan
  playPrayerAlert(sound: PrayerAlertSound, onEnded?: () => void, onStarted?: () => void): HTMLAudioElement | null {
    // Stop any existing audio immediately to prevent multiple audios overlapping
    this.stopAudio();

    if (sound === 'vibrate_only') {
      this.notify(sound);
      triggerHaptic([100, 50, 100, 50, 200]);
      setTimeout(() => {
        this.notify(null);
        if (onEnded) onEnded();
      }, 600);
      return null;
    }

    if (sound === 'chime_gentle') {
      this.notify(sound);
      this.playPrayerChime();
      triggerHaptic(40);
      setTimeout(() => {
        this.notify(null);
        if (onEnded) onEnded();
      }, 1500);
      return null;
    }

    if (sound === 'beep_soft') {
      this.notify(sound);
      this.playSoftBeep();
      triggerHaptic(40);
      setTimeout(() => {
        this.notify(null);
        if (onEnded) onEnded();
      }, 800);
      return null;
    }

    // Full Azan Audio playback
    // Primary path: bundled local static audio (/audio/{sound}.mp3)
    const localUrl = `/audio/${sound}.mp3`;
    const fallbackUrl = AZAN_FALLBACK_URLS[sound] || AZAN_FALLBACK_URLS.azan_makkah;

    const audio = new Audio(localUrl);
    audio.preload = 'auto';
    audio.loop = false; // NEVER loop full azan
    this.currentAudio = audio;
    this.notify(sound);

    if (onStarted) onStarted();

    const cleanup = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        this.notify(null);
      }
      if (onEnded) onEnded();
    };

    audio.onended = cleanup;

    audio.onerror = () => {
      // If local audio path fails, attempt fallback to CDN URL
      console.warn(`Local audio ${localUrl} failed, falling back to CDN...`);
      if (audio.src !== fallbackUrl) {
        audio.src = fallbackUrl;
        audio.load();
        audio.play().catch(() => {
          this.playPrayerChime();
          cleanup();
        });
      } else {
        this.playPrayerChime();
        cleanup();
      }
    };

    audio.play().catch((err) => {
      console.warn('Audio play request error:', err);
      // Attempt fallback if blocked
      if (audio.src !== fallbackUrl) {
        audio.src = fallbackUrl;
        audio.load();
        audio.play().catch(() => {
          this.playPrayerChime();
          cleanup();
        });
      } else {
        this.playPrayerChime();
        cleanup();
      }
    });

    triggerHaptic(30);
    return audio;
  }

  // Play default Makkah Azan audio
  playAzanAudio(onEnded?: () => void): HTMLAudioElement | null {
    return this.playPrayerAlert('azan_makkah', onEnded);
  }

  // Stop currently playing audio cleanly
  stopAudio() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
      } catch {}
      this.currentAudio = null;
    }
    this.notify(null);
  }

  // Pause currently playing audio without losing position
  pauseAudio() {
    if (this.currentAudio && !this.currentAudio.paused) {
      try {
        this.currentAudio.pause();
      } catch {}
      this.notify(this.activeSoundId);
    }
  }

  // Resume currently paused audio from its current position
  resumeAudio(onError?: () => void): boolean {
    if (this.currentAudio && this.currentAudio.paused) {
      try {
        this.currentAudio.playbackRate = this.playbackRate;
        this.currentAudio.play().catch(() => {
          if (onError) onError();
        });
        this.notify(this.activeSoundId);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // Set and persist playback speed for Quran recitation
  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.currentAudio) {
      try {
        this.currentAudio.playbackRate = rate;
      } catch {}
    }
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  getCurrentAudio(): HTMLAudioElement | null {
    return this.currentAudio;
  }

  // Check if audio is currently playing
  isPlaying(soundId?: string): boolean {
    if (!this.currentAudio || this.currentAudio.paused) {
      return false;
    }
    if (soundId) {
      return this.activeSoundId === soundId;
    }
    return true;
  }

  // Get currently playing sound ID
  getActiveSoundId(): string | null {
    return this.activeSoundId;
  }

  // Play Ayah audio (Mishary Alafasy from EveryAyah CDN)
  playAyahAudio(surahNumber: number, ayahNumber: number, onEnded?: () => void, onError?: () => void): HTMLAudioElement {
    this.stopAudio();

    const sPad = surahNumber.toString().padStart(3, '0');
    const aPad = ayahNumber.toString().padStart(3, '0');
    const url = `https://everyayah.com/data/Alafasy_128kbps/${sPad}${aPad}.mp3`;

    const audio = new Audio(url);
    audio.playbackRate = this.playbackRate;
    this.currentAudio = audio;
    this.notify(`quran_${sPad}_${aPad}`);

    audio.play().catch((err) => {
      console.warn('Audio play failed:', err);
      if (onError) onError();
    });

    audio.onended = () => {
      this.currentAudio = null;
      this.notify(null);
      if (onEnded) onEnded();
    };

    audio.onerror = () => {
      this.currentAudio = null;
      this.notify(null);
      if (onError) onError();
    };

    return audio;
  }
}

export const soundManager = new SoundController();

// Trigger tactile vibration
export function triggerHaptic(pattern: number | number[] = 30) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not supported
    }
  }
}

// Request Notification Permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

// Send browser / PWA / Android notification with rich Islamic info
export function sendNotification(
  title: string,
  body: string,
  icon: string = '/icons/icon-192x192.png',
  silent: boolean = true
) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          (reg as any).showNotification(title, {
            body,
            icon,
            badge: '/icons/icon-192x192.png',
            tag: 'waqto-prayer',
            silent, // Suppresses short default system ding so full Azan can play cleanly
            vibrate: [200, 100, 200]
          });
        });
      } else {
        new Notification(title, {
          body,
          icon,
          tag: 'waqto-prayer',
          silent
        });
      }
    } catch {
      // In-app fallback
    }
  }
}
