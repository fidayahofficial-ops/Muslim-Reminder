import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  AdminAccount,
  AdminAuditLog,
  AzanAudioConfig
} from '../types/admin';
import { DailyAmalRecord } from '../types';
import { computeCoinBreakdown, getRankTier } from '../utils/coins';

export const BOOTSTRAPPED_SUPER_ADMIN_EMAIL = 'nafiulislam3810@gmail.com';
const BACKEND_SESSION_STORAGE_KEY = 'waqto_admin_backend_token_v1';

export interface BackendSessionVerification {
  verified: boolean;
  requiresTwoFactor?: boolean;
  twoFactorVerified?: boolean;
  challengeId?: string;
  expiresAt?: number;
  expiresInSeconds?: number;
  dispatchPreviewCode?: string;
  message?: string;
  sessionToken?: string;
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  role?: 'super_admin' | 'admin' | 'content_manager';
  providers?: string[];
  isBootstrappedSuperAdmin?: boolean;
  error?: string;
}

export function getStoredBackendAdminToken(): string | null {
  try {
    return sessionStorage.getItem(BACKEND_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredBackendAdminToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(BACKEND_SESSION_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
    }
  } catch {}
}

// Step 1A: Authenticate Admin with Email + Password via Secure Express Backend (/api/admin/auth-password)
// Strictly locked to nafiulislam3810@gmail.com only -> Initiates 6-digit 2FA Challenge
export async function authenticateAdminWithPasswordOnBackend(
  email: string,
  password: string,
  mode: 'login' | 'setup'
): Promise<BackendSessionVerification> {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
    return {
      verified: false,
      error: `প্রবেশাধিকার সম্পূর্ণ নিষিদ্ধ! শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}) দিয়ে অ্যাডমিন প্যানেলে অ্যাকাউন্ট তৈরি বা লগইন করা যাবে। অন্য কোনো ইমেইল বা Gmail গ্রহণযোগ্য নয়।`
    };
  }

  try {
    const response = await fetch('/api/admin/auth-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        mode
      })
    });
    const data = (await response.json()) as BackendSessionVerification;
    if (data.verified && data.sessionToken) {
      setStoredBackendAdminToken(data.sessionToken);
    }
    return data;
  } catch (err) {
    console.error('Backend password authentication error:', err);
    return {
      verified: false,
      error: 'ব্যাকএন্ড সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। অনুগ্রহ করে পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।'
    };
  }
}

// Step 1B: Initiate 6-digit 2FA Challenge after Google Sign-In for Primary Admin
export async function initiateGoogleAdminTwoFactor(
  user: User
): Promise<BackendSessionVerification> {
  const userEmail = (user.email || '').trim().toLowerCase();
  if (userEmail !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
    return {
      verified: false,
      error: `শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}) এই অ্যাডমিন প্যানেলে অনুমোদিত।`
    };
  }

  try {
    const idToken = await user.getIdToken(true);
    const response = await fetch('/api/admin/init-google-2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      }
    });
    const data = (await response.json()) as BackendSessionVerification;
    return data;
  } catch (err) {
    console.error('Google 2FA init error:', err);
    return {
      verified: false,
      error: '২-ধাপ যাচাইকরণ (2FA) কোড পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
    };
  }
}

// Step 2: Verify 6-Digit 2FA Email Code via Secure Express Backend (/api/admin/verify-2fa)
export async function verifyAdminTwoFactorCode(
  challengeId: string,
  code: string
): Promise<BackendSessionVerification> {
  try {
    const response = await fetch('/api/admin/verify-2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        challengeId: challengeId.trim(),
        code: code.trim()
      })
    });
    const data = (await response.json()) as BackendSessionVerification;
    if (data.verified && data.sessionToken) {
      setStoredBackendAdminToken(data.sessionToken);
    }
    return data;
  } catch (err) {
    console.error('2FA verification error:', err);
    return {
      verified: false,
      error: '২-ধাপ যাচাইকরণ (2FA) সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।'
    };
  }
}

// Resend 6-Digit 2FA Email Code (/api/admin/resend-2fa)
export async function resendAdminTwoFactorCode(
  challengeId: string
): Promise<BackendSessionVerification> {
  try {
    const response = await fetch('/api/admin/resend-2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        challengeId: challengeId.trim()
      })
    });
    return (await response.json()) as BackendSessionVerification;
  } catch (err) {
    console.error('2FA resend error:', err);
    return {
      verified: false,
      error: 'নতুন ২-ধাপ যাচাইকরণ কোড পাঠাতে সমস্যা হয়েছে।'
    };
  }
}

// Verify Stored Backend Session Token (/api/admin/verify-session)
export async function verifyStoredBackendSession(): Promise<AdminAccount | null> {
  const token = getStoredBackendAdminToken();
  if (!token) return null;

  try {
    const response = await fetch('/api/admin/verify-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      setStoredBackendAdminToken(null);
      return null;
    }
    const data = (await response.json()) as BackendSessionVerification;
    if (
      !data.verified ||
      !data.email ||
      data.email.trim().toLowerCase() !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL
    ) {
      setStoredBackendAdminToken(null);
      return null;
    }

    return {
      id: data.uid || `adm_${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}`,
      email: BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
      name: data.displayName || 'Main Super Admin',
      role: 'super_admin',
      status: 'active',
      createdAt: Date.now(),
      createdBy: 'backend_auth',
      lastLoginAt: Date.now()
    };
  } catch {
    return null;
  }
}

// Verify Firebase ID token via Backend API (/api/admin/verify-session)
export async function verifyAdminTokenOnBackend(user: User): Promise<BackendSessionVerification> {
  const userEmail = (user.email || '').trim().toLowerCase();
  if (userEmail !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
    return {
      verified: false,
      error: `শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}) এই অ্যাডমিন প্যানেলে অনুমোদিত।`
    };
  }

  try {
    const idToken = await user.getIdToken(true);
    const response = await fetch('/api/admin/verify-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      }
    });
    const data = (await response.json()) as BackendSessionVerification;
    return data;
  } catch {
    return {
      verified: userEmail === BOOTSTRAPPED_SUPER_ADMIN_EMAIL && user.emailVerified,
      uid: user.uid,
      email: BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
      emailVerified: user.emailVerified,
      displayName: user.displayName || 'Main Super Admin',
      isBootstrappedSuperAdmin: userEmail === BOOTSTRAPPED_SUPER_ADMIN_EMAIL && user.emailVerified
    };
  }
}

// Write immutable audit log to Firestore (/audit_logs/{logId})
export async function recordAdminAuditLog(
  admin: AdminAccount,
  action: string,
  details: string,
  targetType: string = 'system',
  targetId: string = 'global'
): Promise<void> {
  if (!auth.currentUser) return;

  const now = new Date();
  const logId = `log_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
  const dateStr = now.toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const payload: AdminAuditLog = {
    id: logId,
    adminId: auth.currentUser.uid,
    adminEmail: admin.email.slice(0, 200),
    adminName: (admin.name || 'Super Admin').slice(0, 150),
    adminRole: admin.role,
    action: action.slice(0, 100),
    targetType: targetType.slice(0, 100),
    targetId: targetId.slice(0, 128),
    details: details.slice(0, 1000),
    dateStr: dateStr.slice(0, 30),
    timeStr: timeStr.slice(0, 30),
    timestamp: now.getTime()
  };

  try {
    await setDoc(doc(db, 'audit_logs', logId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `audit_logs/${logId}`);
  }
}

// Resolve or bootstrap AdminAccount from Firestore (/admins/{uid})
// Strictly locked to nafiulislam3810@gmail.com
export async function resolveOrBootstrapAdminAccount(user: User): Promise<AdminAccount | null> {
  const uid = user.uid;
  const email = (user.email || '').toLowerCase().trim();

  if (email !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
    return null;
  }

  const adminRef = doc(db, 'admins', uid);

  try {
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      const data = snap.data() as AdminAccount;
      const updated: AdminAccount = {
        ...data,
        id: uid,
        email: BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        status: 'active',
        lastLoginAt: Date.now()
      };
      try {
        await setDoc(adminRef, updated, { merge: true });
      } catch {}
      return updated;
    }

    const superAdminDoc: AdminAccount = {
      id: uid,
      email: BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
      name: (user.displayName || 'Main Super Admin').slice(0, 150),
      role: 'super_admin',
      status: 'active',
      createdAt: Date.now(),
      createdBy: 'system_bootstrap',
      lastLoginAt: Date.now()
    };
    try {
      await setDoc(adminRef, superAdminDoc);
    } catch {}
    return superAdminDoc;
  } catch (error) {
    console.error('Admin account resolution error:', error);
    return {
      id: uid,
      email: BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
      name: (user.displayName || 'Main Super Admin').slice(0, 150),
      role: 'super_admin',
      status: 'active',
      createdAt: Date.now(),
      createdBy: 'system_bootstrap',
      lastLoginAt: Date.now()
    };
  }
}

// Initial seed of built-in licensed Azans into /azan_catalog if empty
export const BUILT_IN_FULL_AZANS: Omit<AzanAudioConfig, 'updatedAt' | 'updatedBy'>[] = [
  {
    id: 'azan_makkah',
    nameBn: 'মক্কা শরিফের আজান',
    nameEn: 'Makkah Al-Mukarramah',
    reciterName: 'শায়খ আলী আহমাদ মোল্লা',
    sourceName: 'মসজিদুল হারাম, মক্কা',
    descriptionBn: 'মসজিদুল হারামের বিশ্বখ্যাত প্রধান মুয়াজ্জিন শায়খ আলী আহমাদ মোল্লার হৃদয়স্পর্শী পূর্ণাঙ্গ আজান',
    badgeBn: 'মসজিদুল হারাম',
    audioUrl: '/audio/azan_makkah.mp3',
    durationSeconds: 212,
    isActive: true,
    isBuiltIn: true,
    prayerType: 'all',
    licenseInfo: 'Public Domain / Authentic Haramain Recording'
  },
  {
    id: 'azan_madinah',
    nameBn: 'মদিনা শরিফের আজান',
    nameEn: 'Madinah Al-Munawwarah',
    reciterName: 'মসজিদুন নববির মুয়াজ্জিন',
    sourceName: 'মসজিদুন নববি, মদিনা',
    descriptionBn: 'মসজিদুন নববির হৃদয়গ্রাহী ও প্রশান্তিময় পূর্ণাঙ্গ আজান',
    badgeBn: 'মসজিদুন নববি',
    audioUrl: '/audio/azan_madinah.mp3',
    durationSeconds: 198,
    isActive: true,
    isBuiltIn: true,
    prayerType: 'all',
    licenseInfo: 'Public Domain / Authentic Haramain Recording'
  },
  {
    id: 'azan_mishary',
    nameBn: 'কারী মিশারি রাশিদ আল-আফাসি',
    nameEn: 'Mishary Rashid Alafasy',
    reciterName: 'শায়খ মিশারি রাশিদ আল-আফাসি',
    sourceName: 'কুয়েত গ্র্যান্ড মসজিদ',
    descriptionBn: 'বিশ্ববিখ্যাত সুমিষ্ট সুরের সুস্পষ্ট ও প্রখ্যাত পূর্ণাঙ্গ আজান',
    badgeBn: 'সুমিষ্ট সুর',
    audioUrl: '/audio/azan_mishary.mp3',
    durationSeconds: 185,
    isActive: true,
    isBuiltIn: true,
    prayerType: 'all',
    licenseInfo: 'Licensed Islamic Audio Archive'
  },
  {
    id: 'azan_aqsa',
    nameBn: 'মসজিদুল আকসার আজান',
    nameEn: 'Masjid Al-Aqsa, Jerusalem',
    reciterName: 'শায়খ নাজি ক্বাজাজ',
    sourceName: 'মসজিদুল আকসা, আল-কুদস',
    descriptionBn: 'পবিত্র বায়তুল মুকাদ্দাস / মসজিদুল আকসার ঐতিহ্যবাহী পূর্ণাঙ্গ আজান',
    badgeBn: 'আল-আকসা',
    audioUrl: '/audio/azan_aqsa.mp3',
    durationSeconds: 176,
    isActive: true,
    isBuiltIn: true,
    prayerType: 'all',
    licenseInfo: 'Public Domain / Al-Aqsa Heritage Recording'
  },
  {
    id: 'azan_fajr',
    nameBn: 'মধুর ফজরের বিশেষ আজান',
    nameEn: 'Fajr Special (Assalatu Khairum Minan Naum)',
    reciterName: 'শায়খ মিশারি রাশিদ আল-আফাসি',
    sourceName: 'ফজর বিশেষ সংকলন',
    descriptionBn: '“আস-সালাতু খাইরুম মিনান নাওম” সমৃদ্ধ ফজরের পূর্ণাঙ্গ বিশেষ আজান',
    badgeBn: 'ফজর বিশেষ',
    audioUrl: '/audio/azan_fajr.mp3',
    durationSeconds: 204,
    isActive: true,
    isBuiltIn: true,
    prayerType: 'fajr',
    licenseInfo: 'Licensed Islamic Audio Archive'
  }
];

export async function initializeBuiltInAzansIfNeeded(admin: AdminAccount): Promise<number> {
  let count = 0;
  for (const item of BUILT_IN_FULL_AZANS) {
    const ref = doc(db, 'azan_catalog', item.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...item,
        updatedAt: Date.now(),
        updatedBy: admin.email
      });
      count++;
    }
  }
  if (count > 0) {
    await recordAdminAuditLog(
      admin,
      'AZAN_CATALOG_SYNC',
      `ডিফল্ট ৫টি পূর্ণাঙ্গ আজান ক্যাটালগে সিঙ্ক করা হয়েছে`,
      'azan_catalog',
      'all'
    );
  }
  return count;
}

// Verify audio duration in browser before allowing Azan upload (rejects < 30s notification clips)
export function validateAudioDurationSeconds(audioSrc: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const timeout = setTimeout(() => {
      reject(new Error('অডিও ফাইল লোড হতে অতিরিক্ত সময় নিচ্ছে বা URL সঠিক নয়।'));
    }, 12000);

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      const dur = Math.round(audio.duration || 0);
      if (!Number.isFinite(dur) || dur < 30) {
        reject(
          new Error(
            `অডিওটির দৈর্ঘ্য মাত্র ${dur} সেকেন্ড। পূর্ণাঙ্গ আজানের জন্য কমপক্ষে ৩০ সেকেন্ডের (সাধারণত ২-৪ মিনিট) অডিও প্রয়োজন। কোনো ছোট নোটিফিকেশন টোন আজান হিসেবে ব্যবহার করা যাবে না।`
          )
        );
      } else {
        resolve(dur);
      }
    };
    audio.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('অডিও ফাইলটি পড়া যায়নি। অনুগ্রহ করে সঠিক MP3/WAV/OGG ফাইল বা বৈধ অডিও লিংক দিন।'));
    };
    audio.src = audioSrc;
  });
}

// Audited Score Verification & Recalculation from real /users/{userId}/amal_records
export async function auditAndRecalculateUserRanking(
  admin: AdminAccount,
  userId: string,
  reason: string
): Promise<{ previousCoins: number; verifiedCoins: number; verifiedStreak: number }> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error('ব্যবহারকারীর প্রোফাইল পাওয়া যায়নি।');
  }
  const userData = userSnap.data();
  const previousCoins = Number(userData.totalCoins) || 0;

  const amalSnap = await getDocs(collection(db, 'users', userId, 'amal_records'));
  const amalMap: Record<string, DailyAmalRecord> = {};
  amalSnap.forEach((d) => {
    const data = d.data();
    amalMap[d.id] = {
      dateKey: d.id,
      prayers: data.prayers || { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      morningAzkarDone: Boolean(data.morningAzkarDone),
      eveningAzkarDone: Boolean(data.eveningAzkarDone),
      fastingDone: Boolean(data.fastingDone),
      sadaqahDone: Boolean(data.sadaqahDone),
      tasbihCount: Number(data.tasbihCount) || 0,
      quranPagesRead: Number(data.quranPagesRead) || 0,
      quranReadMinutes: Number(data.quranReadMinutes) || 0,
      sunnahDone: Boolean(data.sunnahDone),
      duaDone: Boolean(data.duaDone),
      quizDone: Boolean(data.quizDone)
    };
  });

  const breakdown = computeCoinBreakdown(
    amalMap,
    { correctCount: Number(userData.quizCorrectCount) || 0 },
    { completedDays: [] }
  );

  const daysWithAmal = new Set<string>();
  Object.values(amalMap).forEach((rec) => {
    let hasDeed = false;
    if (rec.prayers && Object.values(rec.prayers).some(Boolean)) hasDeed = true;
    if (rec.morningAzkarDone || rec.eveningAzkarDone || rec.fastingDone || rec.sadaqahDone) hasDeed = true;
    if (rec.sunnahDone || rec.duaDone || rec.quizDone || (rec.tasbihCount && rec.tasbihCount > 0)) hasDeed = true;
    if (hasDeed) daysWithAmal.add(rec.dateKey);
  });

  const verifiedStreak = Math.max(1, daysWithAmal.size);
  const verifiedCoins = breakdown.totalCoins;
  const tierInfo = getRankTier(verifiedCoins);

  await setDoc(
    userRef,
    {
      ...userData,
      id: userId,
      name: userData.name || 'মুসাফির',
      totalCoins: verifiedCoins,
      streakDays: verifiedStreak,
      prayerCount: breakdown.prayerCount,
      quranPagesRead: breakdown.quranPagesCount,
      tasbihCount: breakdown.tasbihCount,
      updatedAt: Date.now()
    },
    { merge: true }
  );

  await setDoc(
    doc(db, 'leaderboard', userId),
    {
      userId,
      name: (userData.name || 'মুসাফির').slice(0, 150),
      city: 'বাংলাদেশ',
      totalCoins: verifiedCoins,
      streakDays: verifiedStreak,
      tier: tierInfo.tierName,
      isFlagged: Boolean(userData.isFlagged),
      updatedAt: Date.now()
    },
    { merge: true }
  );

  await recordAdminAuditLog(
    admin,
    'RANKING_AUDIT_CORRECTION',
    `ব্যবহারকারী (${userData.name} - ${userId}) এর আমল রেকর্ড অডিট করে স্কোর ${previousCoins} থেকে প্রকৃত ${verifiedCoins} কয়েনে যাচাইকৃত সমন্বয় করা হয়েছে। কারণ: ${reason}`,
    'user_ranking',
    userId
  );

  return { previousCoins, verifiedCoins, verifiedStreak };
}
