import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Droplets,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WUDU_STEPS, SALAH_STEPS, PRAYER_RAKATS } from '../data/prayerGuide';
import { toBengaliDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

interface WuduVisualMeta {
  stepNumber: number;
  rulingBn: 'ফরজ' | 'সুন্নাত' | 'মুস্তাহাব';
  fardOrderBn?: string;
  repeatBn: string;
  bodyZoneBn: string;
  motionHintBn: string;
}

const WUDU_VISUAL_META: Record<number, WuduVisualMeta> = {
  1: {
    stepNumber: 1,
    rulingBn: 'সুন্নাত',
    repeatBn: '১ বার',
    bodyZoneBn: 'অন্তরের সংকল্প ও জবান',
    motionHintBn: 'অন্তরে পবিত্রতার নিয়ত করে মুখে ‘বিসমিল্লাহ’ বলুন'
  },
  2: {
    stepNumber: 2,
    rulingBn: 'সুন্নাত',
    repeatBn: '৩ বার',
    bodyZoneBn: 'উভয় হাতের কবজি পর্যন্ত',
    motionHintBn: 'ডান ও বাম হাতের আঙ্গুল খিলাল করে কবজি পর্যন্ত ধৌত করুন'
  },
  3: {
    stepNumber: 3,
    rulingBn: 'সুন্নাত',
    repeatBn: '৩ বার',
    bodyZoneBn: 'মুখের অভ্যন্তর ও দাঁত',
    motionHintBn: 'ডান হাতে পানি নিয়ে গড়গড়াসহ কুলি ও মেসওয়াক করুন'
  },
  4: {
    stepNumber: 4,
    rulingBn: 'সুন্নাত',
    repeatBn: '৩ বার',
    bodyZoneBn: 'নাসিকা ও নাকের অগ্রভাগ',
    motionHintBn: 'ডান হাতে নাকে পানি দিয়ে বাম হাতের কনিষ্ঠাঙ্গুলি দ্বারা পরিষ্কার করুন'
  },
  5: {
    stepNumber: 5,
    rulingBn: 'ফরজ',
    fardOrderBn: 'অজুর ১ম ফরজ',
    repeatBn: '৩ বার',
    bodyZoneBn: 'কপাল থেকে থুতনি ও দুই কানের লতি',
    motionHintBn: 'উপর থেকে নিচে সম্পূর্ণ মুখমণ্ডলে পানি প্রবাহিত করুন'
  },
  6: {
    stepNumber: 6,
    rulingBn: 'ফরজ',
    fardOrderBn: 'অজুর ২য় ফরজ',
    repeatBn: '৩ বার (ডান → বাম)',
    bodyZoneBn: 'আঙ্গুলের মাথা থেকে কনুইয়ের ওপর পর্যন্ত',
    motionHintBn: 'প্রথমে ডান হাত, এরপর বাম হাত কনুইসহ ভালোভাবে ধৌত করুন'
  },
  7: {
    stepNumber: 7,
    rulingBn: 'ফরজ',
    fardOrderBn: 'অজুর ৩য় ফরজ',
    repeatBn: '১ বার',
    bodyZoneBn: 'মাথার অগ্রভাগ থেকে ঘাড় ও উভয় কান',
    motionHintBn: 'ভেজা হাত কপাল থেকে ঘাড় পর্যন্ত টেনে পুনরায় সামনে আনুন এবং কান মাসেহ করুন'
  },
  8: {
    stepNumber: 8,
    rulingBn: 'ফরজ',
    fardOrderBn: 'অজুর ৪র্থ ফরজ',
    repeatBn: '৩ বার (ডান → বাম)',
    bodyZoneBn: 'পায়ের আঙ্গুল, গোড়ালি ও টাখনু (গিরা)',
    motionHintBn: 'প্রথমে ডান পা ও পরে বাম পা টাখনুর ওপর পর্যন্ত আঙ্গুল খিলালসহ ধৌত করুন'
  },
  9: {
    stepNumber: 9,
    rulingBn: 'মুস্তাহাব',
    repeatBn: '১ বার',
    bodyZoneBn: 'কালেমা শাহাদাত ও দোয়া পাঠ',
    motionHintBn: 'আকাশের দিকে তাকিয়ে বা কিবলামুখী হয়ে কালেমা শাহাদাত পাঠ করুন'
  }
};

const WuduStepIllustration: React.FC<{ stepNumber: number }> = ({ stepNumber }) => {
  return (
    <div className="relative w-full h-44 sm:h-48 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-950/85 via-[#0f3829] to-[#0a261c] border border-emerald-400/20 shadow-inner">
      {/* Ambient Animated Water Ripples */}
      <motion.div
        key={`ripple-${stepNumber}`}
        initial={{ scale: 0.7, opacity: 0.35 }}
        animate={{ scale: [0.85, 1.25, 0.95], opacity: [0.3, 0.12, 0.3] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-36 h-36 rounded-full border border-sky-300/25 pointer-events-none"
      />
      <motion.div
        key={`ripple2-${stepNumber}`}
        initial={{ scale: 0.9, opacity: 0.2 }}
        animate={{ scale: [1, 1.45, 1], opacity: [0.2, 0.05, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute w-48 h-48 rounded-full border border-emerald-300/15 pointer-events-none"
      />

      {/* Animated Falling Water Droplets (for washing steps 2, 3, 4, 5, 6, 8) */}
      {[2, 3, 4, 5, 6, 8].includes(stepNumber) && (
        <div className="absolute inset-x-0 top-2 flex justify-center gap-8 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: [0, 36, 68], opacity: [0, 0.9, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.45,
                ease: 'easeIn'
              }}
              className="w-2 h-3 rounded-full bg-sky-300/80 shadow-[0_0_8px_rgba(125,211,252,0.8)]"
            />
          ))}
        </div>
      )}

      {/* Step-Specific Vector Diagram with Motion Paths */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepNumber}
          initial={{ opacity: 0, scale: 0.86, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center justify-center text-center px-4"
        >
          {stepNumber === 1 && (
            <svg viewBox="0 0 160 120" className="w-36 h-28">
              {/* Glowing Intention Heart + Bismillah Banner */}
              <motion.circle
                cx="80"
                cy="54"
                r="34"
                fill="rgba(16, 185, 129, 0.15)"
                stroke="#34d399"
                strokeWidth="2"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.path
                d="M80 74 C80 74 56 58 56 43 C56 35 63 30 70 30 C75 30 78 33 80 37 C82 33 85 30 90 30 C97 30 104 35 104 43 C104 58 80 74 80 74 Z"
                fill="rgba(52, 211, 153, 0.35)"
                stroke="#6ee7b7"
                strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9 }}
              />
              <text
                x="80"
                y="105"
                textAnchor="middle"
                fill="#fef3c7"
                fontSize="16"
                fontWeight="bold"
                className="font-arabic"
              >
                بِسْمِ اللَّهِ
              </text>
            </svg>
          )}

          {stepNumber === 2 && (
            <svg viewBox="0 0 160 120" className="w-36 h-28">
              {/* Two palms washing up to wrists with water wave */}
              <motion.path
                d="M42 82 L42 46 C42 41 47 41 47 46 L47 36 C47 31 53 31 53 36 L53 33 C53 28 59 28 59 33 L59 38 C59 33 65 33 65 38 L65 64 L71 54 C74 50 78 53 76 58 L67 82 Z"
                fill="rgba(56, 189, 248, 0.22)"
                stroke="#7dd3fc"
                strokeWidth="2.2"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              <motion.path
                d="M118 82 L118 46 C118 41 113 41 113 46 L113 36 C113 31 107 31 107 36 L107 33 C107 28 101 28 101 33 L101 38 C101 33 95 33 95 38 L95 64 L89 54 C86 50 82 53 84 58 L93 82 Z"
                fill="rgba(52, 211, 153, 0.22)"
                stroke="#6ee7b7"
                strokeWidth="2.2"
                animate={{ x: [0, -5, 0] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              {/* Wrist boundary line */}
              <motion.line
                x1="34"
                y1="83"
                x2="126"
                y2="83"
                stroke="#fcd34d"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />
              <text x="80" y="104" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="bold">
                কবজি পর্যন্ত ৩ বার (আঙ্গুল খিলালসহ)
              </text>
            </svg>
          )}

          {stepNumber === 3 && (
            <svg viewBox="0 0 160 120" className="w-36 h-28">
              {/* Mouth rinsing & Miswak wave animation */}
              <circle cx="80" cy="52" r="28" fill="rgba(56, 189, 248, 0.15)" stroke="#7dd3fc" strokeWidth="2" />
              <motion.path
                d="M64 56 Q80 68 96 56 Q80 62 64 56 Z"
                fill="#38bdf8"
                stroke="#bae6fd"
                strokeWidth="2"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              {/* Swirling water arc inside mouth */}
              <motion.path
                d="M58 45 Q80 32 102 45"
                fill="none"
                stroke="#6ee7b7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6 4"
                animate={{ strokeDashoffset: [0, -20] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              />
              <text x="80" y="104" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="bold">
                কুলি ও মেসওয়াক (৩ বার)
              </text>
            </svg>
          )}

          {stepNumber === 4 && (
            <svg viewBox="0 0 160 120" className="w-36 h-28">
              {/* Nose profile & upward gentle water stream */}
              <path
                d="M76 24 L64 60 C62 66 68 70 76 70 L88 70"
                fill="none"
                stroke="#6ee7b7"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <motion.path
                d="M72 88 L72 68 M82 88 L82 68"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeLinecap="round"
                animate={{ y: [6, -4, 6], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.3, repeat: Infinity }}
              />
              <circle cx="77" cy="66" r="18" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeDasharray="3 3" />
              <text x="80" y="106" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="bold">
                নাকে পানি দেওয়া ও ঝাড়া (৩ বার)
              </text>
            </svg>
          )}

          {stepNumber === 5 && (
            <svg viewBox="0 0 160 120" className="w-36 h-28">
              {/* Full Face Oval (Hairline to Chin, Ear to Ear) with vertical water scan */}
              <ellipse
                cx="80"
                cy="52"
                rx="26"
                ry="34"
                fill="rgba(16, 185, 129, 0.18)"
                stroke="#34d399"
                strokeWidth="2.5"
              />
              {/* Ear to Ear markers */}
              <circle cx="51" cy="52" r="3.5" fill="#fbbf24" />
              <circle cx="109" cy="52" r="3.5" fill="#fbbf24" />
              {/* Hairline to chin markers */}
              <circle cx="80" cy="18" r="3.5" fill="#fbbf24" />
              <circle cx="80" cy="86" r="3.5" fill="#fbbf24" />
              {/* Animated vertical washing wave across face */}
              <motion.line
                x1="48"
                y1="24"
                x2="112"
                y2="24"
                stroke="#38bdf8"
                strokeWidth="3.5"
                strokeLinecap="round"
                animate={{ y: [0, 56, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <text x="80" y="107" textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="bold">
                সম্পূর্ণ মুখমণ্ডল ধোয়া (১ম ফরজ • ৩ বার)
              </text>
            </svg>
          )}

          {stepNumber === 6 && (
            <svg viewBox="0 0 160 120" className="w-36 h-28">
              {/* Forearm + Elbow (কনুইসহ) with directional flow arrow */}
              <path
                d="M28 48 L108 48 C120 48 128 56 128 66 C128 76 120 82 108 82 L28 82 Z"
                fill="rgba(56, 189, 248, 0.18)"
                stroke="#7dd3fc"
                strokeWidth="2.5"
              />
              {/* Highlighted Elbow Joint (কনুই) */}
              <motion.circle
                cx="116"
                cy="65"
                r="14"
                fill="rgba(251, 191, 36, 0.28)"
                stroke="#fbbf24"
                strokeWidth="2"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {/* Directional water sweep from fingers to elbow */}
              <motion.path
                d="M36 65 L112 65"
                stroke="#34d399"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="10 6"
                animate={{ strokeDashoffset: [32, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              />
              <text x="80" y="107" textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="bold">
                কনুইসহ উভয় হাত ধোয়া (২য় ফরজ • ৩ বার)
              </text>
            </svg>
          )}

          {stepNumber === 7 && (
            <svg viewBox="0 0 160 120" className="w-36 h-28">
              {/* Head Crown & Masah Wiping Arc */}
              <circle
                cx="80"
                cy="58"
                r="28"
                fill="rgba(16, 185, 129, 0.15)"
                stroke="#6ee7b7"
                strokeWidth="2.2"
              />
              {/* Masah Arc over top of head */}
              <motion.path
                d="M50 50 C52 20 108 20 110 50"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0.2 }}
                animate={{ pathLength: [0.2, 1, 0.2] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <text x="80" y="107" textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="bold">
                মাথা ও কান মাসেহ করা (৩য় ফরজ • ১ বার)
              </text>
            </svg>
          )}

          {stepNumber === 8 && (
            <svg viewBox="0 0 160 120" className="w-36 h-28">
              {/* Foot & Ankle (টাখনুসহ) */}
              <path
                d="M62 22 L62 64 L38 76 C32 79 34 86 42 86 L108 86 C114 86 116 80 114 72 L96 64 L96 22 Z"
                fill="rgba(56, 189, 248, 0.2)"
                stroke="#7dd3fc"
                strokeWidth="2.5"
              />
              {/* Highlighted Ankle Bone (টাখনু) */}
              <motion.circle
                cx="84"
                cy="54"
                r="11"
                fill="rgba(251, 191, 36, 0.3)"
                stroke="#fbbf24"
                strokeWidth="2.2"
                animate={{ scale: [1, 1.18, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {/* Water level line above ankle */}
              <motion.line
                x1="48"
                y1="36"
                x2="110"
                y2="36"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />
              <text x="80" y="107" textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="bold">
                টাখনুসহ উভয় পা ধোয়া (৪র্থ ফরজ • ৩ বার)
              </text>
            </svg>
          )}

          {stepNumber === 9 && (
            <svg viewBox="0 0 160 120" className="w-36 h-28">
              {/* Islamic Arch (8 Gates of Jannah) & Shahadat */}
              <motion.path
                d="M48 86 L48 48 C48 28 80 18 80 18 C80 18 112 28 112 48 L112 86 Z"
                fill="rgba(251, 191, 36, 0.18)"
                stroke="#fbbf24"
                strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9 }}
              />
              <motion.circle
                cx="80"
                cy="52"
                r="14"
                fill="rgba(52, 211, 153, 0.25)"
                stroke="#6ee7b7"
                strokeWidth="2"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <text x="80" y="106" textAnchor="middle" fill="#fef3c7" fontSize="11" fontWeight="bold">
                কালেমা শাহাদাত ও দোয়া পাঠ (সম্পন্ন)
              </text>
            </svg>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const PrayerGuideView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rakats' | 'wudu' | 'salah'>('rakats');
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [activeWuduStep, setActiveWuduStep] = useState<number>(1);
  const [isAutoPlayingWudu, setIsAutoPlayingWudu] = useState<boolean>(false);

  // Auto-play Wudu step sequence timer
  useEffect(() => {
    if (!isAutoPlayingWudu || activeTab !== 'wudu') return;
    const timer = window.setInterval(() => {
      setActiveWuduStep((prev) => {
        const next = prev >= WUDU_STEPS.length ? 1 : prev + 1;
        setExpandedStep(next);
        return next;
      });
    }, 3600);
    return () => window.clearInterval(timer);
  }, [isAutoPlayingWudu, activeTab]);

  const handleSelectWuduStep = (stepNum: number) => {
    triggerHaptic(15);
    setActiveWuduStep(stepNum);
    setExpandedStep(stepNum);
  };

  const handleStepDelta = (delta: number) => {
    triggerHaptic(15);
    setIsAutoPlayingWudu(false);
    setActiveWuduStep((prev) => {
      const next = Math.min(WUDU_STEPS.length, Math.max(1, prev + delta));
      setExpandedStep(next);
      return next;
    });
  };

  const currentWuduStepObj = WUDU_STEPS.find((s) => s.stepNumber === activeWuduStep) || WUDU_STEPS[0];
  const currentWuduMeta = WUDU_VISUAL_META[activeWuduStep] || WUDU_VISUAL_META[1];
  const wuduProgressPercent = ((activeWuduStep - 1) / (WUDU_STEPS.length - 1)) * 100;

  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          নামাজ ও অজু শিক্ষা গাইড
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          সহিহ হাদিস ও সুন্নাহ ভিত্তিক ধাপে ধাপে পূর্ণাঙ্গ নিয়ম
        </p>
      </div>

      {/* Nav Tabs */}
      <div className="p-1 bg-stone-100 dark:bg-stone-800 rounded-xl grid grid-cols-3">
        <button
          onClick={() => {
            setIsAutoPlayingWudu(false);
            setActiveTab('rakats');
          }}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'rakats'
              ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          ৫ ওয়াক্তের রাকাত
        </button>
        <button
          onClick={() => {
            setActiveTab('wudu');
            setExpandedStep(activeWuduStep);
          }}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'wudu'
              ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          অজুর নিয়ম (৯ ধাপ)
        </button>
        <button
          onClick={() => {
            setIsAutoPlayingWudu(false);
            setActiveTab('salah');
            setExpandedStep(1);
          }}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'salah'
              ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          ধাপে ধাপে নামাজ
        </button>
      </div>

      {/* TAB 1: RAKATS TABLE */}
      {activeTab === 'rakats' && (
        <div className="space-y-3">
          {PRAYER_RAKATS.map((p) => {
            return (
              <div
                key={p.nameBn}
                className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                      {p.nameBn} নামাজ
                    </h3>
                    <span className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-medium">
                      {p.timeWindow}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-xl">
                    মোট {toBengaliDigits(p.totalRakats)} রাকাত
                  </span>
                </div>

                <div className="space-y-1.5">
                  {p.breakdown.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs sm:text-sm py-1.5 px-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                      <span className="text-stone-800 dark:text-stone-200 font-bold">{b.typeBn}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${
                          b.status === 'ফরজ' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-black' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold'
                        }`}>
                          {b.status}
                        </span>
                        <span className="font-mono font-black text-stone-900 dark:text-stone-100">
                          {toBengaliDigits(b.rakats)} রাকাত
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: WUDU STEPS WITH VISUAL TRANSITION ANIMATIONS */}
      {activeTab === 'wudu' && (
        <div className="space-y-3.5">
          {/* Interactive Step-by-Step Animated Wudu Sequencer */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200 dark:border-stone-800 space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                    অজুর ধারাবাহিক ভিজ্যুয়াল গাইড
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-medium">
                    ধাপ {toBengaliDigits(activeWuduStep)} / {toBengaliDigits(WUDU_STEPS.length)} · {currentWuduMeta.rulingBn} ({currentWuduMeta.repeatBn})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setIsAutoPlayingWudu((prev) => !prev);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isAutoPlayingWudu
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isAutoPlayingWudu ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>বিরতি</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>অটো-প্লে</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setIsAutoPlayingWudu(false);
                    handleSelectWuduStep(1);
                  }}
                  className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 cursor-pointer"
                  title="প্রথম ধাপে ফিরুন"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 9-Step Connected Progress Timeline */}
            <div className="relative pt-1 pb-1">
              <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 origin-left"
                  initial={false}
                  animate={{ scaleX: wuduProgressPercent / 100 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                {WUDU_STEPS.map((s) => {
                  const isCurrent = s.stepNumber === activeWuduStep;
                  const isDone = s.stepNumber < activeWuduStep;
                  const isFard = WUDU_VISUAL_META[s.stepNumber]?.rulingBn === 'ফরজ';
                  return (
                    <button
                      key={s.stepNumber}
                      type="button"
                      onClick={() => {
                        setIsAutoPlayingWudu(false);
                        handleSelectWuduStep(s.stepNumber);
                      }}
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-transform cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-600 text-white scale-115 ring-4 ring-emerald-500/25 shadow-sm'
                          : isDone
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                          : isFard
                          ? 'bg-amber-50 dark:bg-stone-800 text-amber-800 dark:text-amber-300 border border-amber-400/60'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700'
                      }`}
                      title={s.titleBn}
                    >
                      {toBengaliDigits(s.stepNumber)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Animated SVG Visual Stage */}
            <WuduStepIllustration stepNumber={activeWuduStep} />

            {/* Animated Step Detail Card Inside Stage */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`detail-${activeWuduStep}`}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    ধাপ {toBengaliDigits(currentWuduStepObj.stepNumber)}: {currentWuduStepObj.titleBn}
                  </h4>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                    {currentWuduMeta.fardOrderBn || currentWuduMeta.rulingBn} · {currentWuduMeta.repeatBn}
                  </span>
                </div>

                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {currentWuduStepObj.descriptionBn}
                </p>

                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium pt-0.5">
                  নির্দেশনা: {currentWuduMeta.motionHintBn}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleStepDelta(-1)}
                disabled={activeWuduStep <= 1}
                className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>পূর্ববর্তী ধাপ</span>
              </button>

              <span className="text-xs text-stone-500 font-mono tabular-nums">
                {toBengaliDigits(activeWuduStep)} / {toBengaliDigits(WUDU_STEPS.length)}
              </span>

              <button
                type="button"
                onClick={() => handleStepDelta(1)}
                disabled={activeWuduStep >= WUDU_STEPS.length}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <span>পরবর্তী ধাপ</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
            <strong>অজুর ৪টি ফরজ (সূরা আল-মায়েদা: ৬):</strong>
            <p>১. সম্পূর্ণ মুখমণ্ডল ধোয়া (ধাপ ৫), ২. দুই হাত কনুইসহ ধোয়া (ধাপ ৬), ৩. মাথার এক চতুর্থাংশ মাসেহ করা (ধাপ ৭), ৪. দুই পা টাখনুসহ ধোয়া (ধাপ ৮)।</p>
          </div>

          {/* Step-by-Step Accordion List Synchronized with Visualizer */}
          {WUDU_STEPS.map((step) => {
            const isExpanded = expandedStep === step.stepNumber;
            const isCurrentActive = activeWuduStep === step.stepNumber;
            const meta = WUDU_VISUAL_META[step.stepNumber];

            return (
              <motion.div
                key={step.stepNumber}
                layout
                className={`bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border transition-colors space-y-2 ${
                  isCurrentActive
                    ? 'border-emerald-500 dark:border-emerald-500/70'
                    : 'border-stone-200 dark:border-stone-800'
                }`}
              >
                <div
                  onClick={() => {
                    triggerHaptic(15);
                    setActiveWuduStep(step.stepNumber);
                    setExpandedStep(isExpanded ? null : step.stepNumber);
                  }}
                  className="flex items-center justify-between cursor-pointer select-none gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isCurrentActive
                          ? 'bg-emerald-600 text-white'
                          : step.stepNumber < activeWuduStep
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {step.stepNumber < activeWuduStep ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        toBengaliDigits(step.stepNumber)
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {step.titleBn}
                      </h3>
                      {meta && (
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                          {meta.rulingBn} · {meta.repeatBn} · {meta.bodyZoneBn}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 space-y-2.5 text-xs">
                        <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
                          {step.descriptionBn}
                        </p>

                        {step.arabic && (
                          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 space-y-1 text-right">
                            <p className="font-arabic text-lg text-stone-900 dark:text-stone-100">
                              {step.arabic}
                            </p>
                            <p className="text-xs text-left italic text-emerald-800 dark:text-emerald-400">
                              {step.transliteration}
                            </p>
                            <p className="text-xs text-left text-stone-700 dark:text-stone-300">
                              {step.translation}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-stone-500">
                            উৎস: {step.reference}
                          </span>

                          {step.stepNumber < WUDU_STEPS.length && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectWuduStep(step.stepNumber + 1);
                              }}
                              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>পরবর্তী ধাপ ({toBengaliDigits(step.stepNumber + 1)})</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* TAB 3: SALAH STEPS */}
      {activeTab === 'salah' && (
        <div className="space-y-3">
          {SALAH_STEPS.map((step) => {
            const isExpanded = expandedStep === step.stepNumber;
            return (
              <div
                key={step.stepNumber}
                className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800 space-y-2"
              >
                <div 
                  onClick={() => setExpandedStep(isExpanded ? null : step.stepNumber)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                      {toBengaliDigits(step.stepNumber)}
                    </span>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {step.titleBn}
                    </h3>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                </div>

                {isExpanded && (
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2 text-xs">
                    <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
                      {step.descriptionBn}
                    </p>

                    {step.arabic && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 space-y-1">
                        <p className="font-arabic text-right text-lg text-stone-900 dark:text-stone-100 leading-relaxed">
                          {step.arabic}
                        </p>
                        {step.transliteration && (
                          <p className="text-xs italic text-emerald-800 dark:text-emerald-400">
                            {step.transliteration}
                          </p>
                        )}
                        {step.translation && (
                          <p className="text-xs text-stone-700 dark:text-stone-300">
                            {step.translation}
                          </p>
                        )}
                      </div>
                    )}

                    <span className="text-[11px] text-stone-500 block">
                      উৎস: {step.reference}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
