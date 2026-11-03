import { DailyAmalRecord } from '../types';

export const COIN_REWARDS = {
  PRAYER: 15,    // ওয়াক্ত প্রতি ১৫ কয়েন
  SUNNAH: 5,     // সুন্নাহ আমল প্রতি ৫ কয়েন
  DUA: 3,        // মাসনূন দোয়া ও দরুদ প্রতি ৩ কয়েন
  TASBIH_33: 1,  // প্রতি ৩৩ তাসবিহ গণনায় ১ কয়েন
  QUIZ_CORRECT: 5, // কুইজে প্রতিটি সঠিক উত্তরে ৫ কয়েন
  FASTING: 20,   // রোজা পালনে ২০ কয়েন
  SADAQAH: 10,   // সদকা বা দানে ১০ কয়েন
  QURAN_PAGE: 2  // কুরআন তিলাওয়াত প্রতি পৃষ্ঠায় ২ কয়েন
};

export interface CoinBreakdown {
  prayerCoins: number;
  prayerCount: number;
  sunnahCoins: number;
  sunnahCount: number;
  duaCoins: number;
  duaCount: number;
  tasbihCoins: number;
  tasbihCount: number;
  quizCoins: number;
  quizCorrectCount: number;
  fastingCoins: number;
  fastingCount: number;
  sadaqahCoins: number;
  sadaqahCount: number;
  quranPagesCount: number;
  quranReadMinutes: number;
  totalCoins: number;
}

export function computeCoinBreakdown(
  amalRecords: Record<string, DailyAmalRecord>,
  quizStats: { correctCount: number },
  rozaStats: { completedDays: number[] }
): CoinBreakdown {
  let prayerCount = 0;
  let sunnahCount = 0;
  let duaCount = 0;
  let tasbihCount = 0;
  let fastingCount = rozaStats?.completedDays?.length || 0;
  let sadaqahCount = 0;
  let quranPagesCount = 0;
  let quranReadMinutes = 0;

  Object.values(amalRecords || {}).forEach((rec) => {
    if (rec.prayers) {
      if (rec.prayers.fajr) prayerCount++;
      if (rec.prayers.dhuhr) prayerCount++;
      if (rec.prayers.asr) prayerCount++;
      if (rec.prayers.maghrib) prayerCount++;
      if (rec.prayers.isha) prayerCount++;
    }
    if (rec.completedSunnahKeys && rec.completedSunnahKeys.length > 0) {
      sunnahCount += rec.completedSunnahKeys.length;
    } else if (rec.sunnahDone) {
      sunnahCount += 1;
    }
    if (rec.completedDuaKeys && rec.completedDuaKeys.length > 0) {
      duaCount += rec.completedDuaKeys.length;
    } else {
      if (rec.morningAzkarDone) duaCount += 1;
      if (rec.eveningAzkarDone) duaCount += 1;
      if (rec.duaDone) duaCount += 1;
    }
    if (rec.tasbihCount) {
      tasbihCount += rec.tasbihCount;
    }
    if (rec.sadaqahDone) {
      sadaqahCount++;
    }
    if (rec.fastingDone && !rozaStats?.completedDays?.includes(1)) {
      fastingCount++;
    }
    if (rec.quranPagesRead && rec.quranPagesRead > 0) {
      quranPagesCount += rec.quranPagesRead;
    }
    if (rec.quranReadMinutes && rec.quranReadMinutes > 0) {
      quranReadMinutes += rec.quranReadMinutes;
    }
  });

  const prayerCoins = prayerCount * COIN_REWARDS.PRAYER;
  const sunnahCoins = sunnahCount * COIN_REWARDS.SUNNAH;
  const duaCoins = duaCount * COIN_REWARDS.DUA;
  const tasbihCoins = Math.floor(tasbihCount / 33) * COIN_REWARDS.TASBIH_33;
  const quizCorrectCount = quizStats?.correctCount || 0;
  const quizCoins = quizCorrectCount * COIN_REWARDS.QUIZ_CORRECT;
  const fastingCoins = fastingCount * COIN_REWARDS.FASTING;
  const sadaqahCoins = sadaqahCount * COIN_REWARDS.SADAQAH;
  const quranCoins = quranPagesCount * COIN_REWARDS.QURAN_PAGE;

  const totalCoins =
    prayerCoins +
    sunnahCoins +
    duaCoins +
    tasbihCoins +
    quizCoins +
    fastingCoins +
    sadaqahCoins +
    quranCoins;

  return {
    prayerCoins,
    prayerCount,
    sunnahCoins,
    sunnahCount,
    duaCoins,
    duaCount,
    tasbihCoins,
    tasbihCount,
    quizCoins,
    quizCorrectCount,
    fastingCoins,
    fastingCount,
    sadaqahCoins,
    sadaqahCount,
    quranPagesCount,
    quranReadMinutes,
    totalCoins
  };
}

export interface RankTierInfo {
  tierName: string;
  subTitle: string;
  minCoins: number;
  nextTierName: string;
  nextTierMinCoins: number;
  progressPercent: number;
}

export function getRankTier(totalCoins: number): RankTierInfo {
  if (totalCoins >= 1000) {
    return {
      tierName: 'সাবিকুন বিল খায়রাত',
      subTitle: 'কল্যাণের পথে অগ্রগামী সর্বোচ্চ স্তর',
      minCoins: 1000,
      nextTierName: 'সর্বোচ্চ স্তর অর্জিত মাশাআল্লাহ!',
      nextTierMinCoins: 1000,
      progressPercent: 100
    };
  }
  if (totalCoins >= 600) {
    return {
      tierName: 'মুত্তাকী',
      subTitle: 'ধারাবাহিক পরহেজগার আমলকারী',
      minCoins: 600,
      nextTierName: 'সাবিকুন বিল খায়রাত (১০০০ কয়েন)',
      nextTierMinCoins: 1000,
      progressPercent: Math.min(100, Math.round(((totalCoins - 600) / 400) * 100))
    };
  }
  if (totalCoins >= 300) {
    return {
      tierName: 'মুহাসিব',
      subTitle: 'দৈনিক আত্মপর্যালোচনাকারী',
      minCoins: 300,
      nextTierName: 'মুত্তাকী (৬০০ কয়েন)',
      nextTierMinCoins: 600,
      progressPercent: Math.min(100, Math.round(((totalCoins - 300) / 300) * 100))
    };
  }
  if (totalCoins >= 100) {
    return {
      tierName: 'সালিক',
      subTitle: 'অনুসন্ধিৎসু নিয়মিত মুসল্লি',
      minCoins: 100,
      nextTierName: 'মুহাসিব (৩০০ কয়েন)',
      nextTierMinCoins: 300,
      progressPercent: Math.min(100, Math.round(((totalCoins - 100) / 200) * 100))
    };
  }
  return {
    tierName: 'মুবতাদী',
    subTitle: 'প্রাথমিক দ্বীনি শিক্ষার্থী ও আমলকারী',
    minCoins: 0,
    nextTierName: 'সালিক (১০০ কয়েন)',
    nextTierMinCoins: 100,
    progressPercent: Math.min(100, Math.round((totalCoins / 100) * 100))
  };
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  city: string;
  coins: number;
  tier: string;
  streak: number;
  isCurrentUser?: boolean;
  isFlagged?: boolean;
}

export interface RemoteLeaderboardRecord {
  userId: string;
  name: string;
  city?: string;
  totalCoins: number;
  streakDays: number;
  tier?: string;
  isFlagged?: boolean;
  updatedAt: number;
}

// Compute live leaderboard strictly from real Firestore users + current user
export function getComputedLeaderboard(
  userCoins: number,
  userName: string = 'আপনি (মুসাফির)',
  streak: number = 1,
  remoteEntries: RemoteLeaderboardRecord[] = [],
  currentUserId?: string | null
): LeaderboardEntry[] {
  const map = new Map<string, Omit<LeaderboardEntry, 'rank'>>();

  for (const r of remoteEntries) {
    if (!r || !r.userId) continue;
    const isMe = Boolean(currentUserId && r.userId === currentUserId);
    map.set(r.userId, {
      id: r.userId,
      name: r.name || 'মুসাফির',
      city: r.city || 'বাংলাদেশ',
      coins: Number(r.totalCoins) || 0,
      tier: r.tier || getRankTier(Number(r.totalCoins) || 0).tierName,
      streak: Math.max(1, Number(r.streakDays) || 1),
      isCurrentUser: isMe,
      isFlagged: Boolean(r.isFlagged)
    });
  }

  const selfKey = currentUserId || 'local_current_user';
  map.set(selfKey, {
    id: selfKey,
    name: userName || 'আপনি (মুসাফির)',
    city: map.get(selfKey)?.city || 'আমার অবস্থান',
    coins: userCoins,
    tier: getRankTier(userCoins).tierName,
    streak: Math.max(1, streak),
    isCurrentUser: true
  });

  const list = Array.from(map.values());
  list.sort((a, b) => b.coins - a.coins);

  return list.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));
}
