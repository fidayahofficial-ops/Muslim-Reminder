import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Award, 
  BookOpen, 
  Flame, 
  Sparkles,
  Coins,
  Calendar,
  Check
} from 'lucide-react';
import { AUTHENTIC_QUIZ_QUESTIONS, getDailyQuizQuestions } from '../data/quizData';
import { QuizQuestion } from '../types';
import { toBengaliDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';
import { storage } from '../utils/storage';
import { useSync } from '../context/SyncContext';
import { COIN_REWARDS } from '../utils/coins';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const QuizView: React.FC = () => {
  const { amalRecords, saveAmalRecord, publishedQuizzes } = useSync();
  const [quizMode, setQuizMode] = useState<'daily' | 'practice'>('daily');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [revealedAnswerIdx, setRevealedAnswerIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState(() => storage.getQuizStats());
  const [justEarnedCoins, setJustEarnedCoins] = useState<number | null>(null);

  // Today's date formatted in Bengali
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Convert published Firestore quizzes (correctAnswerIndex kept hidden as -1 until user submits)
  const remoteQuizPool = useMemo<QuizQuestion[]>(() => {
    return (publishedQuizzes || []).map((q) => ({
      id: q.id,
      category: q.category || 'general',
      categoryBn: q.categoryBn,
      difficulty: q.difficulty,
      questionBn: q.questionBn,
      optionsBn: q.optionsBn,
      correctAnswerIndex: -1, // Protected in quiz_secrets until user answers
      explanationBn: q.explanationBn,
      reference: q.reference
    }));
  }, [publishedQuizzes]);

  // Deterministic daily questions (remote published for today + fallback static questions)
  const dailyQuestions = useMemo(() => {
    const baseDaily = getDailyQuizQuestions(today, 5);
    if (remoteQuizPool.length === 0) return baseDaily;
    const combined = [...remoteQuizPool, ...baseDaily];
    return combined.slice(0, Math.max(5, remoteQuizPool.length));
  }, [remoteQuizPool]);

  const practiceQuestions = useMemo(() => {
    return [...remoteQuizPool, ...AUTHENTIC_QUIZ_QUESTIONS];
  }, [remoteQuizPool]);

  const questionPool = quizMode === 'daily' ? dailyQuestions : practiceQuestions;

  const currentQ: QuizQuestion = questionPool[currentIndex] || questionPool[0];
  const isFinished = currentIndex >= questionPool.length;
  const activeCorrectIndex = revealedAnswerIdx !== null ? revealedAnswerIdx : currentQ?.correctAnswerIndex;

  const handleSelectOption = async (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);

    let actualCorrectIdx = currentQ.correctAnswerIndex;
    if (actualCorrectIdx === -1) {
      try {
        const secretSnap = await getDoc(doc(db, 'quiz_secrets', currentQ.id));
        if (secretSnap.exists()) {
          actualCorrectIdx = Number(secretSnap.data().correctAnswerIndex);
        } else {
          actualCorrectIdx = 0;
        }
      } catch {
        actualCorrectIdx = 0;
      }
    }
    setRevealedAnswerIdx(actualCorrectIdx);
    setIsAnswered(true);

    const isCorrect = idx === actualCorrectIdx;
    if (isCorrect) {
      triggerHaptic([30, 50]);
      setScore(prev => prev + 1);
      setJustEarnedCoins(COIN_REWARDS.QUIZ_CORRECT);
      setTimeout(() => setJustEarnedCoins(null), 2500);

      const nextStats = {
        streak: stats.streak + 1,
        totalAnswered: stats.totalAnswered + 1,
        correctCount: stats.correctCount + 1,
        lastDate: new Date().toISOString()
      };
      setStats(nextStats);
      storage.saveQuizStats(nextStats);

      // Record in today's AmalRecord
      const currentRec = amalRecords[todayKey] || {
        dateKey: todayKey,
        prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
        morningAzkarDone: false,
        eveningAzkarDone: false,
        fastingDone: false,
        sadaqahDone: false,
        tasbihCount: 0
      };
      saveAmalRecord({
        ...currentRec,
        quizDone: true,
        quizScore: (currentRec.quizScore || 0) + 1
      });
    } else {
      triggerHaptic(100);
      const nextStats = {
        ...stats,
        totalAnswered: stats.totalAnswered + 1,
        lastDate: new Date().toISOString()
      };
      setStats(nextStats);
      storage.saveQuizStats(nextStats);
    }
  };

  const handleNext = () => {
    triggerHaptic(20);
    if (currentIndex + 1 >= questionPool.length) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#177a56', '#10b981', '#f59e0b']
      });
    }
    setCurrentIndex(prev => prev + 1);
    setSelectedOption(null);
    setRevealedAnswerIdx(null);
    setIsAnswered(false);
  };

  const handleRestart = (mode?: 'daily' | 'practice') => {
    if (mode) setQuizMode(mode);
    setCurrentIndex(0);
    setSelectedOption(null);
    setRevealedAnswerIdx(null);
    setIsAnswered(false);
    setScore(0);
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* Quiz Top Header & Streak Status */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#177a56] dark:text-emerald-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayFormatted}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 mt-0.5">
              <HelpCircle className="w-5 h-5 text-[#177a56] dark:text-emerald-400" />
              <span>দৈনিক ইসলামিক কুইজ</span>
            </h2>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              ডাটা অন/অফ উভয় অবস্থাতেই প্রতিদিন স্বয়ংক্রিয়ভাবে নতুন প্রশ্ন আপডেট হয়
            </span>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{toBengaliDigits(stats.streak)} দিনের স্ট্রিক</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
              <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>+{toBengaliDigits(COIN_REWARDS.QUIZ_CORRECT)} কয়েন/প্রশ্ন</span>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800/80 p-1 border border-stone-200/80 dark:border-stone-700/60 text-xs">
          <button
            onClick={() => handleRestart('daily')}
            className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
              quizMode === 'daily'
                ? 'bg-white dark:bg-[#177a56] text-[#177a56] dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            আজকের কুইজ (৫টি প্রশ্ন)
          </button>
          <button
            onClick={() => handleRestart('practice')}
            className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
              quizMode === 'practice'
                ? 'bg-white dark:bg-[#177a56] text-[#177a56] dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            অনুশীলনী ভাণ্ডার ({toBengaliDigits(AUTHENTIC_QUIZ_QUESTIONS.length)}টি)
          </button>
        </div>
      </div>

      {/* Floating Coin Earning Toast (Yellow Frosted Glass) */}
      {justEarnedCoins !== null && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400/55 via-yellow-300/45 to-amber-500/55 dark:from-amber-400/35 dark:via-yellow-400/25 dark:to-amber-500/35 backdrop-blur-xl backdrop-saturate-150 text-amber-950 dark:text-amber-50 font-extrabold text-xs sm:text-sm flex items-center gap-2.5 border border-amber-200/80 dark:border-amber-300/45 ring-1 ring-white/45 shadow-[0_8px_30px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] whitespace-nowrap max-w-[92vw]">
            <div className="w-6 h-6 rounded-full bg-amber-400/70 dark:bg-amber-400/40 border border-white/70 flex items-center justify-center shrink-0 shadow-xs">
              <Coins className="w-3.5 h-3.5 text-amber-950 dark:text-amber-100 fill-amber-500" />
            </div>
            <span className="truncate drop-shadow-[0_1px_1px_rgba(255,255,255,0.45)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              +{toBengaliDigits(justEarnedCoins)} কয়েন অর্জিত! মাশাআল্লাহ
            </span>
          </div>
        </div>
      )}

      {/* QUIZ COMPLETION SCREEN */}
      {isFinished ? (
        <div className="bg-white dark:bg-[#131b17] rounded-3xl p-6 sm:p-8 text-center shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-[#177a56] dark:text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500/30">
            <Award className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              মাশাআল্লাহ! কুইজ সম্পন্ন
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              আজকের নির্ধারিত ইসলামিক কুইজ সফলভাবে শেষ হয়েছে
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-500/20 max-w-sm mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-700 dark:text-stone-300">সঠিক উত্তরের সংখ্যা:</span>
              <span className="font-extrabold text-base text-[#177a56] dark:text-emerald-400 font-mono">
                {toBengaliDigits(score)} / {toBengaliDigits(questionPool.length)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-500/15">
              <span className="text-stone-700 dark:text-stone-300">মোট অর্জিত কয়েন:</span>
              <span className="font-black text-amber-600 dark:text-amber-400 font-mono text-sm flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 fill-current" />
                +{toBengaliDigits(score * COIN_REWARDS.QUIZ_CORRECT)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => handleRestart()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#177a56] text-white text-xs sm:text-sm font-bold hover:bg-[#126446] transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              আবার দিন
            </button>
            {quizMode === 'daily' && (
              <button
                onClick={() => handleRestart('practice')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                অনুশীলন করুন
              </button>
            )}
          </div>
        </div>
      ) : (
        /* QUESTION CARD */
        <div className="bg-white dark:bg-[#131b17] rounded-3xl p-5 sm:p-6 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500 pb-2 border-b border-stone-100 dark:border-stone-800">
            <span className="font-semibold">
              ক্যাটাগরি: <strong className="text-[#177a56] dark:text-emerald-400">{currentQ.categoryBn}</strong>
            </span>
            <span className="font-mono font-bold">
              প্রশ্ন: {toBengaliDigits(currentIndex + 1)}/{toBengaliDigits(questionPool.length)}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
            {currentQ.questionBn}
          </h3>

          {/* Options */}
          <div className="space-y-2">
            {currentQ.optionsBn.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectAnswer = idx === activeCorrectIndex;

              let style = 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 font-medium';

              if (isAnswered) {
                if (isCorrectAnswer) {
                  style = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold';
                } else if (isSelected) {
                  style = 'bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-950 dark:text-rose-100 font-bold';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer select-none ${style}`}
                >
                  <span>{opt}</span>
                  {isAnswered && isCorrectAnswer && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">+{toBengaliDigits(COIN_REWARDS.QUIZ_CORRECT)} কয়েন</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                  )}
                  {isAnswered && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation & Source reference on answering */}
          {isAnswered && (
            <div className="p-4 bg-stone-50 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
              <div>
                <strong className="text-stone-900 dark:text-stone-100 font-bold block mb-1">
                  বিশদ দলিল ও ব্যাখ্যা:
                </strong>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
                  {currentQ.explanationBn}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px] text-[#177a56] dark:text-emerald-400 font-semibold flex items-center justify-between">
                <span>রেফারেন্স: {currentQ.reference}</span>
                <span className="text-stone-400">সহিহ সূত্র</span>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={handleNext}
                  className="px-5 py-2 rounded-xl bg-[#177a56] text-white font-bold hover:bg-[#126446] transition-colors cursor-pointer text-xs sm:text-sm shadow-xs"
                >
                  পরবর্তী প্রশ্ন →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
