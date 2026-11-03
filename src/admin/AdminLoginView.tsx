import React, { useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Server,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { auth, googleProvider } from '../firebase/config';
import { WaqtoLogo } from '../components/WaqtoLogo';
import {
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
  authenticateAdminWithPasswordOnBackend,
  initiateGoogleAdminTwoFactor,
  verifyAdminTwoFactorCode,
  resendAdminTwoFactorCode,
  setStoredBackendAdminToken
} from './adminService';

interface AdminLoginViewProps {
  unauthorizedError?: string | null;
  onBackToApp: () => void;
  onBackendAdminAuthenticated?: () => void;
}

interface ActiveTwoFactorChallenge {
  challengeId: string;
  email: string;
  expiresAt: number;
  dispatchPreviewCode?: string;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  unauthorizedError,
  onBackToApp,
  onBackendAdminAuthenticated
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'setup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // 2-Factor Authentication (2FA) State
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<ActiveTwoFactorChallenge | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);

  // Live countdown timer for active 2FA challenge
  useEffect(() => {
    if (!twoFactorChallenge) return;

    const updateTimer = () => {
      const secs = Math.max(0, Math.ceil((twoFactorChallenge.expiresAt - Date.now()) / 1000));
      setRemainingSeconds(secs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [twoFactorChallenge]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErrorMsg('অনুগ্রহ করে প্রধান অ্যাডমিন ইমেইল এবং পাসওয়ার্ড উভয়ই প্রদান করুন।');
      return;
    }

    // STRICT EXCLUSIVITY CHECK: Block any email other than nafiulislam3810@gmail.com
    if (trimmedEmail !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
      setErrorMsg(
        `প্রবেশাধিকার নিষিদ্ধ! শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}) দিয়ে এই অ্যাডমিন প্যানেলে অ্যাকাউন্ট তৈরি বা লগইন করা যাবে। অন্য কোনো ইমেইল বা Gmail অনুমোদিত নয়।`
      );
      return;
    }

    if (password.length < 6) {
      setErrorMsg('নিরাপত্তার স্বার্থে পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setLoading(true);
    try {
      // 1. Cryptographically authenticate Email + Password via Secure Express Backend (/api/admin/auth-password)
      const backendResult = await authenticateAdminWithPasswordOnBackend(
        trimmedEmail,
        password,
        authMode
      );

      if (backendResult.requiresTwoFactor && backendResult.challengeId) {
        // Also attempt Firebase Email/Password sign-in silently if enabled in Firebase project
        try {
          await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch {
          // Safe to ignore if Firebase project only has Google OAuth enabled
        }

        setTwoFactorChallenge({
          challengeId: backendResult.challengeId,
          email: backendResult.email || BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
          expiresAt: backendResult.expiresAt || Date.now() + 5 * 60 * 1000,
          dispatchPreviewCode: backendResult.dispatchPreviewCode
        });
        setTwoFactorCode('');
        setInfoMsg(
          backendResult.message ||
            `প্রাথমিক লগইন সফল হয়েছে। ২-ধাপ যাচাইকরণের (2FA) জন্য ${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}-এ পাঠানো ৬-সংখ্যার কোডটি লিখুন।`
        );
        setLoading(false);
        return;
      }

      if (!backendResult.verified) {
        setErrorMsg(
          backendResult.error || 'ভুল ইমেইল অথবা পাসওয়ার্ড। অনুগ্রহ করে সঠিক অ্যাডমিন তথ্য দিন।'
        );
        setLoading(false);
        return;
      }

      if (onBackendAdminAuthenticated) {
        onBackendAdminAuthenticated();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'প্রমাণীকরণে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const signedInEmail = (cred.user?.email || '').trim().toLowerCase();
      if (signedInEmail !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
        await signOut(auth);
        setStoredBackendAdminToken(null);
        setErrorMsg(
          `প্রবেশাধিকার নিষিদ্ধ! আপনার নির্বাচিত Gmail (${signedInEmail}) অনুমোদিত নয়। শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}) দিয়ে প্রবেশ করা যাবে।`
        );
        setLoading(false);
        return;
      }

      // Initiate 2FA Challenge for Google-authenticated Primary Admin
      const challengeRes = await initiateGoogleAdminTwoFactor(cred.user);
      if (challengeRes.requiresTwoFactor && challengeRes.challengeId) {
        setTwoFactorChallenge({
          challengeId: challengeRes.challengeId,
          email: challengeRes.email || BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
          expiresAt: challengeRes.expiresAt || Date.now() + 5 * 60 * 1000,
          dispatchPreviewCode: challengeRes.dispatchPreviewCode
        });
        setTwoFactorCode('');
        setInfoMsg(
          challengeRes.message ||
            `গুগল লগইন যাচাই সফল হয়েছে। ২-ধাপ নিরাপত্তার (2FA) জন্য ${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}-এ পাঠানো ৬-সংখ্যার কোডটি প্রদান করুন।`
        );
        setLoading(false);
        return;
      }

      setErrorMsg(challengeRes.error || '২-ধাপ যাচাইকরণ (2FA) শুরু করা যায়নি।');
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setErrorMsg('গুগল প্রমাণীকরণ সম্পন্ন হয়নি। অনুগ্রহ করে উপরের ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorChallenge) return;

    setErrorMsg(null);
    setInfoMsg(null);

    const cleanCode = twoFactorCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrorMsg('অনুগ্রহ করে ৬-সংখ্যার সঠিক ২-ধাপ যাচাইকরণ (2FA) কোডটি প্রদান করুন।');
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await verifyAdminTwoFactorCode(twoFactorChallenge.challengeId, cleanCode);
      if (!verifyRes.verified) {
        setErrorMsg(verifyRes.error || 'ভুল ২-ধাপ যাচাইকরণ (2FA) কোড। আবার চেষ্টা করুন।');
        setLoading(false);
        return;
      }

      setTwoFactorChallenge(null);
      setTwoFactorCode('');
      if (onBackendAdminAuthenticated) {
        onBackendAdminAuthenticated();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '২-ধাপ যাচাইকরণ সম্পন্ন করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  const handleResendTwoFactor = async () => {
    if (!twoFactorChallenge) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const resendRes = await resendAdminTwoFactorCode(twoFactorChallenge.challengeId);
      if (resendRes.requiresTwoFactor && resendRes.challengeId) {
        setTwoFactorChallenge({
          challengeId: resendRes.challengeId,
          email: resendRes.email || BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
          expiresAt: resendRes.expiresAt || Date.now() + 5 * 60 * 1000,
          dispatchPreviewCode: resendRes.dispatchPreviewCode
        });
        setTwoFactorCode('');
        setInfoMsg(
          resendRes.message ||
            `নতুন ৬-সংখ্যার ২-ধাপ যাচাইকরণ কোড ${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}-এ পাঠানো হয়েছে।`
        );
      } else {
        setErrorMsg(resendRes.error || 'নতুন কোড পাঠানো যায়নি।');
      }
    } catch {
      setErrorMsg('নতুন কোড পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTwoFactor = () => {
    setTwoFactorChallenge(null);
    setTwoFactorCode('');
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const handleClearSession = async () => {
    setStoredBackendAdminToken(null);
    setTwoFactorChallenge(null);
    setTwoFactorCode('');
    await signOut(auth);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#0c120f] text-stone-100 flex flex-col justify-between p-4 sm:p-8 font-bengali selection:bg-emerald-500 selection:text-stone-950">
      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WaqtoLogo size={36} />
          <div>
            <span className="text-base font-bold tracking-tight text-white block leading-none">
              Muslim Reminder
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              সিকিউর অ্যাডমিন ম্যানেজমেন্ট কনসোল
            </span>
          </div>
        </div>

        <button
          onClick={onBackToApp}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-stone-800 bg-stone-900/80 hover:bg-stone-800 text-xs font-semibold text-stone-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>মূল অ্যাপে ফিরে যান</span>
        </button>
      </div>

      {/* Main Centered Login / 2FA Card */}
      <div className="max-w-md w-full mx-auto my-8 bg-[#131b17] border border-stone-800/90 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-emerald-950 border border-emerald-700/40 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800/60 text-[11px] font-bold text-emerald-300">
              <Lock className="w-3 h-3" />
              <span>{twoFactorChallenge ? 'ধাপ ২/২ · 2FA যাচাইকরণ' : 'ধাপ ১/২ · প্রাথমিক প্রমাণীকরণ'}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {twoFactorChallenge
              ? '২-ধাপ নিরাপত্তা যাচাইকরণ (2FA)'
              : 'প্রধান অ্যাডমিন প্যানেল লগইন'}
          </h1>
          <p className="text-xs text-stone-400 leading-relaxed">
            {twoFactorChallenge ? (
              <>
                প্রধান অ্যাডমিন (<span className="text-emerald-400 font-mono font-bold">{twoFactorChallenge.email}</span>) এর নিরাপত্তা নিশ্চিত করতে ইমেইলে প্রেরিত ৬-সংখ্যার ওয়ান-টাইম ভেরিফিকেশন কোডটি (OTP) নিচে প্রদান করুন।
              </>
            ) : (
              <>
                এই অ্যাডমিন প্যানেল শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (<span className="text-emerald-400 font-mono font-bold">{BOOTSTRAPPED_SUPER_ADMIN_EMAIL}</span>) এর জন্য সংরক্ষিত। অন্য কোনো ইমেইল বা Gmail দিয়ে এখানে অ্যাকাউন্ট খোলা বা প্রবেশ করা সম্পূর্ণ নিষিদ্ধ।
              </>
            )}
          </p>
        </div>

        {/* Unauthorized or Auth Error Notice */}
        {(unauthorizedError || errorMsg) && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-200 text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-bold text-rose-300">নিরাপত্তা বিজ্ঞপ্তি</p>
                <p className="leading-relaxed">{unauthorizedError || errorMsg}</p>
              </div>
            </div>
            {unauthorizedError && (
              <button
                type="button"
                onClick={handleClearSession}
                className="text-[11px] font-semibold text-rose-300 underline hover:text-white cursor-pointer"
              >
                প্রধান অ্যাডমিন অ্যাকাউন্ট দিয়ে চেষ্টা করতে সেশন রিসেট করুন
              </button>
            )}
          </div>
        )}

        {infoMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/70 text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{infoMsg}</p>
          </div>
        )}

        {twoFactorChallenge ? (
          /* STEP 2: 2-Factor Authentication (2FA) Verification Form */
          <div className="space-y-5">
            {/* Dispatched Email OTP Box for Instant Verification */}
            {twoFactorChallenge.dispatchPreviewCode && (
              <div className="p-4 rounded-xl bg-stone-900/95 border border-emerald-700/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>ইমেইল সিকিউরিটি ডিসপ্যাচ ({twoFactorChallenge.email})</span>
                  </span>
                  <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>মেয়াদ: {formatCountdown(remainingSeconds)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <p className="text-[11px] text-stone-400">আপনার ৬-সংখ্যার ওয়ান-টাইম 2FA কোড:</p>
                    <p className="text-lg font-mono font-extrabold tracking-[0.25em] text-white mt-0.5">
                      {twoFactorChallenge.dispatchPreviewCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTwoFactorCode(twoFactorChallenge.dispatchPreviewCode || '')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-600/50 text-emerald-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>কোড বসান</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-300">
                    ৬-সংখ্যার ২-ধাপ যাচাইকরণ কোড (2FA Code)
                  </label>
                  <span className="text-[11px] text-stone-400 font-mono">
                    {remainingSeconds > 0 ? `অবশিষ্ট সময় ${formatCountdown(remainingSeconds)}` : 'মেয়াদ উত্তীর্ণ'}
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-stone-900 border border-stone-700 text-center font-mono text-lg tracking-[0.35em] font-bold text-white placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6 || remainingSeconds === 0}
                className="w-full py-2.5 px-4 rounded-lg bg-[#177a56] hover:bg-[#136647] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {loading
                    ? '২-ধাপ কোড যাচাই করা হচ্ছে...'
                    : '2FA যাচাই করুন ও ড্যাশবোর্ডে প্রবেশ করুন'}
                </span>
              </button>
            </form>

            <div className="flex items-center justify-between gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={handleResendTwoFactor}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>নতুন কোড পাঠান</span>
              </button>

              <button
                type="button"
                onClick={handleCancelTwoFactor}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-200 font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>লগইনে ফিরে যান</span>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1: Primary Email & Password / Google Sign-In */
          <>
            {/* Mode Switcher */}
            <div className="flex p-1 rounded-lg bg-stone-900 border border-stone-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-md transition-colors cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-[#177a56] text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                ইমেইল ও পাসওয়ার্ড লগইন
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('setup');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-md transition-colors cursor-pointer ${
                  authMode === 'setup'
                    ? 'bg-[#177a56] text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                অ্যাডমিন পাসওয়ার্ড সেটআপ
              </button>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">
                  প্রধান অ্যাডমিন ইমেইল (শুধুমাত্র অনুমোদিত ইমেইল)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={BOOTSTRAPPED_SUPER_ADMIN_EMAIL}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-stone-900 border border-stone-800 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">
                  পাসওয়ার্ড (Password — কমপক্ষে ৬ অক্ষর)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-stone-900 border border-stone-800 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer"
                    aria-label="পাসওয়ার্ড দেখুন"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#177a56] hover:bg-[#136647] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {loading
                    ? 'ব্যাকএন্ডে যাচাই করা হচ্ছে...'
                    : authMode === 'login'
                    ? 'লগইন করুন ও 2FA কোড পাঠান'
                    : 'পাসওয়ার্ড সেটআপ করুন ও 2FA কোড পাঠান'}
                </span>
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-stone-800 w-full" />
              <span className="bg-[#131b17] px-3 text-[11px] text-stone-500 whitespace-nowrap">
                অথবা প্রধান অ্যাডমিন গুগল লগইন + 2FA
              </span>
              <div className="border-t border-stone-800 w-full" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAdminSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-stone-200 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Google Sign-In ({BOOTSTRAPPED_SUPER_ADMIN_EMAIL})</span>
            </button>
          </>
        )}

        {/* Security Architecture Footer Note */}
        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500">
          <span className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-emerald-500" />
            <span>Single-Owner Lock · Scrypt + 2FA OTP</span>
          </span>
          <span>Exclusive Super Admin</span>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-stone-600">
        Muslim Reminder (মুসলিম রিমাইন্ডার) সিকিউর অ্যাডমিন প্যানেল · সর্বস্বত্ব সংরক্ষিত
      </div>
    </div>
  );
};
