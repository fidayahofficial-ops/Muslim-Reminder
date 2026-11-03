import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  Flame, 
  Star, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  ShieldCheck, 
  TrendingUp,
  User,
  HeartHandshake,
  Coins,
  Medal,
  Users
} from 'lucide-react';
import { storage } from '../utils/storage';
import { toBengaliDigits } from '../utils/prayerTimes';
import { useSync } from '../context/SyncContext';
import { computeCoinBreakdown, getRankTier, getComputedLeaderboard, COIN_REWARDS } from '../utils/coins';

interface RankingViewProps {
  onNavigateSection?: (section: string) => void;
}

export const RankingView: React.FC<RankingViewProps> = () => {
  const { user, amalRecords, remoteLeaderboard } = useSync();
  const profile = storage.getUserProfile();
  const quizStats = storage.getQuizStats();
  const rozaStats = storage.getRozaTracker();

  // Compute authentic coins breakdown from real logged deeds
  const coinBreakdown = computeCoinBreakdown(amalRecords, quizStats, rozaStats);
  const tierInfo = getRankTier(coinBreakdown.totalCoins);

  // Compute streak
  const streakDays = Math.max(1, Object.keys(amalRecords).length > 0 ? Object.keys(amalRecords).length : quizStats.streak || 1);

  // Compute live leaderboard with user placed at exact rank from real user records
  const leaderboard = getComputedLeaderboard(
    coinBreakdown.totalCoins,
    profile.name || user?.displayName || 'আপনি (মুসাফির)',
    streakDays,
    remoteLeaderboard,
    user?.uid
  );
  const userRankEntry = leaderboard.find(e => e.isCurrentUser);
  const userRank = userRankEntry ? userRankEntry.rank : leaderboard.length;

  // Real Badges unlocked based on authentic verifiable actions
  const badges = [
    {
      id: 'b1',
      title: 'ইলম অন্বেষণকারী',
      desc: 'কমপক্ষে ১টি বিশুদ্ধ কুইজের সঠিক উত্তর দেওয়া হয়েছে',
      icon: '📖',
      unlocked: (quizStats.correctCount || 0) >= 1
    },
    {
      id: 'b2',
      title: 'সালাত মুহাফিজ',
      desc: '৫ ওয়াক্ত সালাত নিয়মিত আমল ট্র্যাকারে রেকর্ড করা হয়েছে',
      icon: '🕌',
      unlocked: coinBreakdown.prayerCount >= 5
    },
    {
      id: 'b3',
      title: 'সুন্নাহর অনুসারী',
      desc: 'অন্তত ৩টি দৈনন্দিন সুন্নাহ আমল সম্পন্ন করা হয়েছে',
      icon: '✨',
      unlocked: coinBreakdown.sunnahCount >= 3
    },
    {
      id: 'b4',
      title: 'ধারাবাহিক আমলকারী',
      desc: 'টানা ৩ দিন আমল বা কুইজ স্ট্রিক বজায় রাখা হয়েছে',
      icon: '🔥',
      unlocked: streakDays >= 3
    },
    {
      id: 'b5',
      title: 'স্মরণকারী (জাকিরীন)',
      desc: 'ডিজিটাল তাসবিহ বা আজকারে ১০০+ গণনা সম্পন্ন',
      icon: '📿',
      unlocked: coinBreakdown.tasbihCount >= 100
    },
    {
      id: 'b6',
      title: 'সিয়াম পালনকারী',
      desc: 'রমজান বা নফল রোজা সম্পন্ন হিসেবে রেকর্ডভুক্ত',
      icon: '🌙',
      unlocked: (rozaStats.completedDays?.length || 0) >= 1 || coinBreakdown.fastingCount >= 1
    }
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Header Trophy Card with Live Ranking & Coins */}
      <div className="bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 text-white rounded-3xl p-5 shadow-lg border border-amber-600/40 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 border border-amber-400/20 rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>দ্বীনি স্তর · অবস্থান #{toBengaliDigits(userRank)}</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {tierInfo.tierName}
            </h2>
            <p className="text-xs text-amber-100/90 font-medium">
              {tierInfo.subTitle}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-amber-400 text-stone-950 px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">
                <Coins className="w-3.5 h-3.5 fill-stone-950" />
                <span>{toBengaliDigits(coinBreakdown.totalCoins)} হাসানাহ কয়েন</span>
              </span>
            </div>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex flex-col items-center justify-center shrink-0">
            <Award className="w-7 h-7 text-amber-300" />
            <span className="text-[10px] font-bold text-amber-200 mt-0.5">
              {toBengaliDigits(unlockedCount)}/{toBengaliDigits(badges.length)} ব্যাজ
            </span>
          </div>
        </div>

        {/* Progress Bar to Next Level */}
        <div className="mt-4 pt-3 border-t border-white/15 space-y-1.5">
          <div className="flex justify-between text-xs text-amber-100">
            <span>পরবর্তী লক্ষ্য: {tierInfo.nextTierName}</span>
            <span className="font-mono font-bold">{toBengaliDigits(tierInfo.progressPercent)}%</span>
          </div>
          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-200 rounded-full transition-all duration-500"
              style={{ width: `${tierInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Live Community Leaderboard */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-none">
                দ্বীনি আমল ও হাসানাহ লিডারবোর্ড
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                আমল, সুন্নাহ ও সালাতভিত্তিক সৎকর্মের প্রতিযোগিতা
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-mono">
            র‌্যাংক #{toBengaliDigits(userRank)}
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          {leaderboard.slice(0, 10).map((entry) => {
            const isUser = !!entry.isCurrentUser;
            let rankColor = 'text-stone-500 dark:text-stone-400';
            if (entry.rank === 1) rankColor = 'text-amber-500 font-extrabold';
            else if (entry.rank === 2) rankColor = 'text-slate-400 font-bold';
            else if (entry.rank === 3) rankColor = 'text-amber-700 font-bold';

            return (
              <div
                key={entry.id}
                className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 border-2 border-amber-500/60 dark:border-amber-400/50 shadow-xs'
                    : 'bg-stone-50/80 dark:bg-stone-900/40 border border-stone-200/70 dark:border-stone-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center text-sm font-mono ${rankColor}`}>
                    #{toBengaliDigits(entry.rank)}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs sm:text-sm font-bold leading-tight ${isUser ? 'text-amber-900 dark:text-amber-200' : 'text-stone-900 dark:text-stone-100'}`}>
                        {entry.name}
                      </span>
                      {isUser && (
                        <span className="text-[10px] font-bold bg-[#177a56] text-white px-1.5 py-0.2 rounded-full">
                          আপনি
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">
                      {entry.city} · {entry.tier}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs sm:text-sm font-extrabold font-mono text-[#177a56] dark:text-emerald-400 flex items-center justify-end gap-1">
                    <Coins className="w-3 h-3 text-amber-500 fill-amber-500" />
                    +{toBengaliDigits(entry.coins)}
                  </span>
                  <span className="text-[10px] text-stone-400 font-medium block">
                    {toBengaliDigits(entry.streak)} দিন স্ট্রিক
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Authentic Coin & Point Breakdown */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
            <span>অর্জিত হাসানাহ কয়েনের বিবরণ</span>
          </h3>
          <span className="text-[10px] text-stone-500 dark:text-stone-400">
            বিশুদ্ধ পরিমিত স্কোর নীতি
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {/* Salah */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
            <span className="text-stone-700 dark:text-stone-300">
              ৫ ওয়াক্ত সালাত আদায় ({toBengaliDigits(coinBreakdown.prayerCount)} ওয়াক্ত × {toBengaliDigits(COIN_REWARDS.PRAYER)} কয়েন)
            </span>
            <span className="font-bold text-[#177a56] dark:text-emerald-400 font-mono">
              +{toBengaliDigits(coinBreakdown.prayerCoins)} কয়েন
            </span>
          </div>

          {/* Sunnah */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
            <span className="text-stone-700 dark:text-stone-300">
              সুন্নাহ আমল পালন ({toBengaliDigits(coinBreakdown.sunnahCount)}টি × {toBengaliDigits(COIN_REWARDS.SUNNAH)} কয়েন)
            </span>
            <span className="font-bold text-[#177a56] dark:text-emerald-400 font-mono">
              +{toBengaliDigits(coinBreakdown.sunnahCoins)} কয়েন
            </span>
          </div>

          {/* Duas */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
            <span className="text-stone-700 dark:text-stone-300">
              মাসনূন দোয়া ও দরুদ ({toBengaliDigits(coinBreakdown.duaCount)}টি × {toBengaliDigits(COIN_REWARDS.DUA)} কয়েন)
            </span>
            <span className="font-bold text-[#177a56] dark:text-emerald-400 font-mono">
              +{toBengaliDigits(coinBreakdown.duaCoins)} কয়েন
            </span>
          </div>

          {/* Tasbih */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
            <span className="text-stone-700 dark:text-stone-300">
              ডিজিটাল তাসবিহ জিকির ({toBengaliDigits(coinBreakdown.tasbihCount)} বার গণনা)
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
              +{toBengaliDigits(coinBreakdown.tasbihCoins)} কয়েন
            </span>
          </div>

          {/* Quiz */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
            <span className="text-stone-700 dark:text-stone-300">
              ইসলামিক কুইজ সঠিক উত্তর ({toBengaliDigits(coinBreakdown.quizCorrectCount)}টি × {toBengaliDigits(COIN_REWARDS.QUIZ_CORRECT)} কয়েন)
            </span>
            <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">
              +{toBengaliDigits(coinBreakdown.quizCoins)} কয়েন
            </span>
          </div>

          {/* Fasting & Charity */}
          {(coinBreakdown.fastingCoins > 0 || coinBreakdown.sadaqahCoins > 0) && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
              <span className="text-stone-700 dark:text-stone-300">
                সিয়াম ও সদকা আমল
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                +{toBengaliDigits(coinBreakdown.fastingCoins + coinBreakdown.sadaqahCoins)} কয়েন
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Earned Islamic Badges */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center justify-between">
          <span>দ্বীনি অর্জন ও পদকসমূহ (Badges)</span>
          <span className="text-[11px] text-[#177a56] dark:text-emerald-400 font-normal">
            {toBengaliDigits(unlockedCount)}টি অর্জিত
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                b.unlocked
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300/80 dark:border-emerald-800'
                  : 'bg-stone-50 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800 opacity-60'
              }`}
            >
              <div className="text-2xl shrink-0 p-1.5 bg-white dark:bg-stone-900 rounded-xl shadow-xs">
                {b.icon}
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {b.title}
                  </h4>
                  {b.unlocked && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#177a56] dark:text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-snug">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Strict Transparency Guarantee */}
      <div className="p-4 rounded-3xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs space-y-1.5 text-stone-600 dark:text-stone-400">
        <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
          <span>ওয়াক্তের বিশুদ্ধ র‍্যাংকিং ও কয়েন নীতি</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          ওয়াক্ত কখনো অতিরিক্ত কাল্পনিক বা অযৌক্তিক কয়েন প্রদান করে না। এখানে প্রদর্শিত প্রতিটি কয়েন ও অবস্থান আপনার আদায়কৃত সালাত, সহিহ সুন্নাহ আমল, জিকির এবং বিশুদ্ধ কুইজ থেকে সরাসরি নির্ধারিত হয়।
        </p>
      </div>
    </div>
  );
};
