import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Play, 
  Pause, 
  Bookmark, 
  Share2, 
  Copy, 
  ChevronLeft, 
  ChevronRight,
  Type, 
  BookOpen,
  ArrowRight,
  Check,
  SkipBack,
  SkipForward,
  Square,
  Repeat,
  Volume2
} from 'lucide-react';
import { ALL_SURAHS_META, getSurahDetails, OFFLINE_SURAHS } from '../data/quranSurahs';
import { convertQuranTranslitToBengali } from '../utils/quranTransliteration';
import { SurahDetail, Ayah, UserSettings } from '../types';
import { toBengaliDigits } from '../utils/prayerTimes';
import { soundManager, triggerHaptic } from '../utils/audio';
import { storage } from '../utils/storage';
import { useSync } from '../context/SyncContext';

interface QuranReaderViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenShareModal: (content: { title: string; arabic?: string; translation: string; reference: string }) => void;
  selectedSurahNumber?: number | null;
  onSelectSurah?: (surahNumber: number | null) => void;
}

/**
 * Represents a single token (Arabic word + optional end-of-ayah marker)
 * along with its proportional Bengali translation slice and transliteration slice.
 */
interface MushafWordToken {
  ayah: Ayah;
  ayahIndex: number;
  arabicWord: string;
  bengaliSlice: string;
  translitSlice: string;
  isEndOfAyah: boolean;
  isStartOfAyah: boolean;
}

/**
 * Represents one complete horizontal ruled line on a Mushaf page,
 * where multiple short ayahs or segments of long ayahs flow continuously
 * from right to left (just like a real printed Mushaf), with the corresponding
 * thin Bengali translation line directly underneath.
 */
interface ContinuousMushafLine {
  lineNumberInSurah: number;
  tokens: MushafWordToken[];
  isLastLineOfSurah: boolean;
  primaryAyah: Ayah;
  primaryAyahIndex: number;
  distinctAyahsInLine: { ayah: Ayah; ayahIndex: number }[];
  combinedBengaliText: string;
  combinedTranslitText: string;
}

/**
 * Converts a number to Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)
 */
function toArabicDigits(num: number | string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => arabicDigits[Number(d)]);
}

/**
 * Packs all ayahs of a Surah into continuous, edge-to-edge Mushaf lines
 * so that short verses sit side-by-side on the same line separated by ornate
 * rosette medallions (۝), while long verses wrap smoothly across lines—and
 * each ruled line carries its exact synchronized thin Bengali translation underneath.
 */
function buildContinuousMushafLines(
  surah: SurahDetail,
  wordsPerLine: number
): ContinuousMushafLine[] {
  const allTokens: MushafWordToken[] = [];

  surah.ayahs.forEach((ayah, ayahIndex) => {
    const arWords = ayah.textArabic.trim().split(/\s+/).filter(Boolean);
    const bnWords = ayah.textBengali.trim().split(/\s+/).filter(Boolean);
    const fullTranslit =
      ayah.transliterationBn ||
      convertQuranTranslitToBengali(ayah.textEnglish, ayah.textArabic);
    const trWords = fullTranslit.trim().split(/\s+/).filter(Boolean);

    const totalAr = Math.max(arWords.length, 1);

    arWords.forEach((arWord, wIdx) => {
      const bnStart = Math.round((wIdx * bnWords.length) / totalAr);
      const bnEnd = Math.round(((wIdx + 1) * bnWords.length) / totalAr);
      const trStart = Math.round((wIdx * trWords.length) / totalAr);
      const trEnd = Math.round(((wIdx + 1) * trWords.length) / totalAr);

      allTokens.push({
        ayah,
        ayahIndex,
        arabicWord: arWord,
        bengaliSlice: bnWords.slice(bnStart, bnEnd).join(' '),
        translitSlice: trWords.slice(trStart, trEnd).join(' '),
        isStartOfAyah: wIdx === 0,
        isEndOfAyah: wIdx === totalAr - 1
      });
    });
  });

  const lines: ContinuousMushafLine[] = [];
  let currentTokens: MushafWordToken[] = [];
  let currentWeight = 0;

  const flushLine = (isLast: boolean) => {
    if (currentTokens.length === 0) return;

    const ayahSegmentsMap = new Map<
      number,
      {
        ayah: Ayah;
        ayahIndex: number;
        bnParts: string[];
        trParts: string[];
        containsEnd: boolean;
      }
    >();

    currentTokens.forEach((tk) => {
      const existing = ayahSegmentsMap.get(tk.ayah.numberInSurah);
      if (existing) {
        if (tk.bengaliSlice) existing.bnParts.push(tk.bengaliSlice);
        if (tk.translitSlice) existing.trParts.push(tk.translitSlice);
        if (tk.isEndOfAyah) existing.containsEnd = true;
      } else {
        ayahSegmentsMap.set(tk.ayah.numberInSurah, {
          ayah: tk.ayah,
          ayahIndex: tk.ayahIndex,
          bnParts: tk.bengaliSlice ? [tk.bengaliSlice] : [],
          trParts: tk.translitSlice ? [tk.translitSlice] : [],
          containsEnd: tk.isEndOfAyah
        });
      }
    });

    const distinctAyahsInLine: { ayah: Ayah; ayahIndex: number }[] = [];
    const bnChunks: string[] = [];
    const trChunks: string[] = [];

    ayahSegmentsMap.forEach((seg) => {
      distinctAyahsInLine.push({ ayah: seg.ayah, ayahIndex: seg.ayahIndex });
      const bnText = seg.bnParts.join(' ').trim();
      const trText = seg.trParts.join(' ').trim();
      if (bnText) {
        bnChunks.push(
          seg.containsEnd
            ? `${bnText} (${toBengaliDigits(seg.ayah.numberInSurah)})`
            : bnText
        );
      } else if (seg.containsEnd) {
        bnChunks.push(`(${toBengaliDigits(seg.ayah.numberInSurah)})`);
      }
      if (trText) {
        trChunks.push(
          seg.containsEnd
            ? `${trText} (${toBengaliDigits(seg.ayah.numberInSurah)})`
            : trText
        );
      }
    });

    lines.push({
      lineNumberInSurah: lines.length + 1,
      tokens: currentTokens,
      isLastLineOfSurah: isLast,
      primaryAyah: currentTokens[0].ayah,
      primaryAyahIndex: currentTokens[0].ayahIndex,
      distinctAyahsInLine,
      combinedBengaliText: bnChunks.join(' • '),
      combinedTranslitText: trChunks.join(' • ')
    });

    currentTokens = [];
    currentWeight = 0;
  };

  allTokens.forEach((token, idx) => {
    const tokenWeight = 1 + (token.isEndOfAyah ? 0.65 : 0);
    if (currentWeight + tokenWeight > wordsPerLine && currentTokens.length > 0) {
      flushLine(false);
    }
    currentTokens.push(token);
    currentWeight += tokenWeight;

    if (idx === allTokens.length - 1) {
      flushLine(true);
    }
  });

  return lines;
}

/**
 * Ornate Rosette Medallion (۝) styled in the app's signature Emerald Green & Mint palette.
 */
const MushafAyahMedallion: React.FC<{
  number: number;
  onClick?: (e: React.MouseEvent) => void;
  isActive?: boolean;
}> = ({ number, onClick, isActive }) => {
  return (
    <span
      onClick={onClick}
      title={`আয়াত ${toBengaliDigits(number)} (অপশন দেখতে ট্যাপ করুন)`}
      className={`inline-flex items-center justify-center mx-1 sm:mx-1.5 align-middle select-none cursor-pointer transition-transform hover:scale-110 ${
        isActive ? 'scale-110' : ''
      }`}
    >
      <span className="relative inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7">
        {/* Ornate 8-petalled Islamic Rosette SVG in App Emerald & Mint */}
        <svg
          viewBox="0 0 36 36"
          className="absolute inset-0 w-full h-full drop-shadow-[0_1px_1px_rgba(6,78,59,0.2)]"
        >
          {/* Outer 8-pointed star / rosette in Emerald */}
          <polygon
            points="18,1 22,6 29,4 29,11 35,15 31,21 34,27 27,29 24,35 18,32 12,35 9,29 2,27 5,21 1,15 7,11 7,4 14,6"
            fill={isActive ? '#064e3b' : '#177a56'}
            stroke="#064e3b"
            strokeWidth="1.2"
          />
          <circle
            cx="18"
            cy="18"
            r="11.5"
            fill="#0d5238"
            stroke="#6ee7b7"
            strokeWidth="1"
          />
          <circle
            cx="18"
            cy="18"
            r="9.2"
            fill={isActive ? '#d1fae5' : '#f4fbf7'}
            stroke="#10b981"
            strokeWidth="0.9"
          />
        </svg>
        <span className="relative z-10 font-sans text-[10px] sm:text-[11px] font-extrabold text-[#064e3b] leading-none pt-0.5">
          {toBengaliDigits(number)}
        </span>
      </span>
    </span>
  );
};

/**
 * Illuminated Surah Banner Cartouche matching the Mushaf composition,
 * recolored in the app's signature Deep Emerald, Mint & Crisp White palette.
 */
const IlluminatedSurahCartouche: React.FC<{
  nameArabic: string;
  nameBengali: string;
  meaningBengali: string;
  versesCount: number;
  surahNumber: number;
  revelationType: string;
}> = ({
  nameArabic,
  nameBengali,
  meaningBengali,
  versesCount,
  surahNumber,
  revelationType
}) => {
  return (
    <div className="relative border-y-2 border-[#0d5238] dark:border-emerald-700/70 bg-[#0b4630] p-1 sm:p-1.5 shadow-inner overflow-hidden select-none">
      {/* Fine Mint-Emerald Inner Border */}
      <div className="relative border border-emerald-400/60 bg-gradient-to-r from-[#093826] via-[#136847] to-[#093826] px-2 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-3 overflow-hidden">
        {/* Emerald & Mint Floral Lattice Background SVG */}
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full opacity-30"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="surah-cartouche-emerald-filigree"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M12 2 L22 12 L12 22 L2 12 Z"
                fill="none"
                stroke="#6ee7b7"
                strokeWidth="1"
              />
              <circle cx="12" cy="12" r="4.5" fill="none" stroke="#ffffff" strokeWidth="0.9" />
              <circle cx="12" cy="12" r="1.8" fill="#34d399" />
              <circle cx="0" cy="0" r="2" fill="#6ee7b7" />
              <circle cx="24" cy="0" r="2" fill="#6ee7b7" />
              <circle cx="0" cy="24" r="2" fill="#6ee7b7" />
              <circle cx="24" cy="24" r="2" fill="#6ee7b7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#surah-cartouche-emerald-filigree)" />
        </svg>

        {/* Left Crisp Mint-White Scalloped Medallion (Verse Count) */}
        <div className="relative z-10 flex items-center justify-center shrink-0">
          <div className="px-2 sm:px-3 py-1 rounded-full bg-white dark:bg-[#131b17] border-2 border-emerald-400/80 shadow-xs text-center">
            <div className="text-[9px] sm:text-[10px] font-extrabold text-[#0d5238] dark:text-emerald-300 leading-tight">
              আয়াত: {toBengaliDigits(versesCount)}
            </div>
            <div className="text-[8px] sm:text-[9px] font-bold text-[#177a56] dark:text-emerald-400/90 leading-tight">
              {revelationType}
            </div>
          </div>
        </div>

        {/* Center App-Signature Emerald & Mint Cartouche Plaque */}
        <div className="relative z-10 flex-1 max-w-[260px] sm:max-w-xs mx-auto">
          <div className="relative rounded-lg bg-gradient-to-b from-emerald-300 via-emerald-500 to-[#0d5238] p-[2px] shadow-md border border-[#062e1f]">
            <div className="rounded-[6px] border border-white/70 bg-gradient-to-r from-[#ebf7f2] via-white to-[#ebf7f2] dark:from-[#12211a] dark:via-[#172a21] dark:to-[#12211a] px-3 py-1 text-center">
              <h2
                dir="rtl"
                className="font-arabic text-xl sm:text-2xl font-bold text-[#0b4630] dark:text-emerald-300 leading-tight tracking-normal"
              >
                سُورَةُ {nameArabic}
              </h2>
              <p className="text-[10px] sm:text-[11px] font-extrabold text-[#177a56] dark:text-emerald-400 leading-tight mt-0.5">
                সূরা {nameBengali} ({meaningBengali})
              </p>
            </div>
          </div>
        </div>

        {/* Right Crisp Mint-White Scalloped Medallion (Surah Number) */}
        <div className="relative z-10 flex items-center justify-center shrink-0">
          <div className="px-2 sm:px-3 py-1 rounded-full bg-white dark:bg-[#131b17] border-2 border-emerald-400/80 shadow-xs text-center">
            <div className="text-[9px] sm:text-[10px] font-extrabold text-[#0d5238] dark:text-emerald-300 leading-tight">
              সূরা নং
            </div>
            <div className="text-[10px] sm:text-[11px] font-black text-[#177a56] dark:text-emerald-400 leading-tight">
              {toBengaliDigits(surahNumber)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Reusable App-Signature Emerald, Mint & White Floral Lattice Mushaf Page Wrapper
 * (Zero yellow/beige — 100% matched with Waqto's Emerald & White theme).
 */
const MushafIlluminatedPageFrame: React.FC<{
  topLeftHeaderAr: string;
  topLeftHeaderBn: string;
  topRightHeaderAr: string;
  topRightHeaderBn: string;
  pageNumber: number;
  totalPages?: number;
  marginalBadgeText?: string;
  children: React.ReactNode;
}> = ({
  topLeftHeaderAr,
  topLeftHeaderBn,
  topRightHeaderAr,
  topRightHeaderBn,
  pageNumber,
  totalPages,
  marginalBadgeText,
  children
}) => {
  const patternId = `mushaf-emerald-border-${pageNumber}`;

  return (
    <div className="relative mx-auto w-full rounded-[14px] sm:rounded-[18px] bg-white dark:bg-[#131b17] text-stone-900 dark:text-stone-100 pt-2 pb-2.5 px-2 sm:pt-3 sm:pb-3.5 sm:px-4 shadow-md border border-emerald-950/10 dark:border-emerald-500/20">
      {/* Subtle Book Spine & Emerald Lighting Sheen */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-emerald-900/8 dark:from-emerald-500/10 to-transparent rounded-l-[14px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-3.5 bg-gradient-to-l from-emerald-900/8 dark:from-emerald-500/10 to-transparent rounded-r-[14px]"
        aria-hidden="true"
      />

      {/* ================================================================ */}
      {/* 1. TOP OUTSIDE PAPER MARGIN (Above the floral border frame)      */}
      {/* ================================================================ */}
      <div className="flex items-end justify-between px-2 sm:px-3 pb-1 text-[#0d5238] dark:text-emerald-300 select-none">
        {/* Left Top Corner: Surah Name */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-arabic text-sm sm:text-base font-bold leading-none">
            {topLeftHeaderAr}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-[#177a56] dark:text-emerald-400/80">
            ({topLeftHeaderBn})
          </span>
        </div>

        {/* Right Top Corner: Juz / Para Name */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#177a56] dark:text-emerald-400/80">
            ({topRightHeaderBn})
          </span>
          <span className="font-arabic text-sm sm:text-base font-bold leading-none">
            {topRightHeaderAr}
          </span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. EMERALD GREEN, MINT & WHITE FLORAL ILLUMINATED BORDER         */}
      {/* ================================================================ */}
      <div className="relative p-[11px] sm:p-[15px] rounded-[8px] border-[1.5px] border-[#093826] dark:border-emerald-600/60 shadow-xs overflow-hidden">
        {/* Continuous SVG Wallpaper creating the Emerald, Mint & White Floral Lattice Border */}
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id={patternId}
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              {/* Deep Emerald Base */}
              <rect width="20" height="20" fill="#0d5238" />
              {/* Outer Emerald Lattice Diamond */}
              <polygon
                points="10,0 20,10 10,20 0,10"
                fill="#177a56"
                stroke="#6ee7b7"
                strokeWidth="1.2"
              />
              {/* Corner Mint Dots */}
              <circle cx="0" cy="0" r="2.1" fill="#6ee7b7" />
              <circle cx="20" cy="0" r="2.1" fill="#6ee7b7" />
              <circle cx="0" cy="20" r="2.1" fill="#6ee7b7" />
              <circle cx="20" cy="20" r="2.1" fill="#6ee7b7" />
              {/* Crisp White 4-Petal Floral Rosette in Center */}
              <circle cx="10" cy="6.5" r="2.1" fill="#ffffff" />
              <circle cx="10" cy="13.5" r="2.1" fill="#ffffff" />
              <circle cx="6.5" cy="10" r="2.1" fill="#ffffff" />
              <circle cx="13.5" cy="10" r="2.1" fill="#ffffff" />
              {/* Bright Mint Flower Core */}
              <circle
                cx="10"
                cy="10"
                r="2.2"
                fill="#34d399"
                stroke="#0d5238"
                strokeWidth="0.6"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>

        {/* Four Corner Emerald-Mint Medallion Accents */}
        <span className="pointer-events-none absolute top-0 left-0 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#34d399] border-r border-b border-[#093826] flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#093826]" />
        </span>
        <span className="pointer-events-none absolute top-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#34d399] border-l border-b border-[#093826] flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#093826]" />
        </span>
        <span className="pointer-events-none absolute bottom-0 left-0 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#34d399] border-r border-t border-[#093826] flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#093826]" />
        </span>
        <span className="pointer-events-none absolute bottom-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#34d399] border-l border-t border-[#093826] flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#093826]" />
        </span>

        {/* ============================================================== */}
        {/* 3. INNER RULED MUSHAF CANVAS                                   */}
        {/* ============================================================== */}
        <div className="relative z-10 border-[2px] border-[#093826] dark:border-emerald-700 bg-white dark:bg-[#111915] shadow-inner">
          <div className="border border-emerald-500/40 dark:border-emerald-500/30">{children}</div>
        </div>
      </div>

      {/* Outer Margin Ornament Badge */}
      {marginalBadgeText && (
        <div
          className="hidden sm:flex pointer-events-none absolute right-0.5 top-28 flex-col items-center select-none"
          aria-hidden="true"
        >
          <div className="w-0.5 h-2.5 bg-[#177a56]" />
          <div className="px-1 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950 border-2 border-[#177a56] shadow-xs flex flex-col items-center justify-center">
            <span className="text-[8px] font-extrabold text-[#0d5238] dark:text-emerald-300 writing-vertical-rl">
              {marginalBadgeText}
            </span>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 4. BOTTOM OUTSIDE PAPER MARGIN (Page Number Medallion)           */}
      {/* ================================================================ */}
      <div className="pt-1.5 flex items-center justify-center gap-2 text-[#0d5238] dark:text-emerald-300 select-none">
        <span className="h-[1px] w-10 bg-emerald-600/40" />
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-600/40 text-[11px] font-extrabold text-[#0d5238] dark:text-emerald-300">
          পৃষ্ঠা {toBengaliDigits(pageNumber)}
          {totalPages ? ` / ${toBengaliDigits(totalPages)}` : ''} •{' '}
          <span className="font-arabic text-xs">{toArabicDigits(pageNumber)}</span>
        </span>
        <span className="h-[1px] w-10 bg-emerald-600/40" />
      </div>
    </div>
  );
};

export const QuranReaderView: React.FC<QuranReaderViewProps> = React.memo(({
  settings,
  onUpdateSettings,
  onOpenShareModal,
  selectedSurahNumber: propSurahNumber,
  onSelectSurah
}) => {
  const { saveBookmark } = useSync();
  const [internalSurahNumber, setInternalSurahNumber] = useState<number | null>(null);
  const activeSurahNumber = propSurahNumber !== undefined ? propSurahNumber : internalSurahNumber;

  const handleSurahSelect = (num: number | null) => {
    if (onSelectSurah) {
      onSelectSurah(num);
    } else {
      setInternalSurahNumber(num);
    }
  };

  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [nextSurahDetail, setNextSurahDetail] = useState<SurahDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [showTranslit, setShowTranslit] = useState(false);
  const [selectedActionAyah, setSelectedActionAyah] = useState<Ayah | null>(null);

  // Scroll to top whenever active surah changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    setSelectedActionAyah(null);
  }, [activeSurahNumber]);
  
  // Audio playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [playingAyahNumber, setPlayingAyahNumber] = useState<number | null>(null);
  const [ayahProgressPercent, setAyahProgressPercent] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(() => soundManager.getPlaybackRate());
  const [repeatAyahMode, setRepeatAyahMode] = useState<boolean>(false);
  const repeatAyahRef = useRef<boolean>(false);
  repeatAyahRef.current = repeatAyahMode;
  const [isCopied, setIsCopied] = useState<number | null>(null);

  // Last read record
  const [lastRead, setLastRead] = useState<{ surahNumber: number; ayahNumber: number; surahNameBn: string } | null>(() => storage.getLastRead());

  // Load selected Surah details
  useEffect(() => {
    if (!activeSurahNumber) {
      soundManager.stopAudio();
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
      setPlayingAyahNumber(null);
      setAyahProgressPercent(0);
      setSurahDetail(null);
      setNextSurahDetail(null);
      return;
    }

    let isMounted = true;
    setLoadingSurah(true);
    setNextSurahDetail(null);
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
    setPlayingAyahNumber(null);
    setAyahProgressPercent(0);

    getSurahDetails(activeSurahNumber)
      .then((detail) => {
        if (isMounted) {
          setSurahDetail(detail);
          setLoadingSurah(false);
          const record = {
            surahNumber: detail.number,
            ayahNumber: 1,
            surahNameBn: detail.nameBengali
          };
          setLastRead(record);
          storage.saveLastRead(record);

          if (detail.versesCount <= 35 && activeSurahNumber < 114) {
            getSurahDetails(activeSurahNumber + 1)
              .then((nextDetail) => {
                if (isMounted) setNextSurahDetail(nextDetail);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setSurahDetail(OFFLINE_SURAHS[1]);
          setLoadingSurah(false);
        }
      });

    return () => {
      isMounted = false;
      soundManager.stopAudio();
    };
  }, [activeSurahNumber]);

  // Attach timeupdate listener to active audio element for smooth progress bar
  useEffect(() => {
    if (!isPlayingAudio) return;
    const audioEl = soundManager.getCurrentAudio();
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      if (audioEl.duration && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
        setAyahProgressPercent(Math.min(100, Math.round((audioEl.currentTime / audioEl.duration) * 100)));
      }
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isPlayingAudio, playingAyahNumber]);

  // Start playing a specific Ayah by number and index
  const startAyahPlayback = (ayahNumber: number, index: number) => {
    if (!activeSurahNumber || !surahDetail) return;

    triggerHaptic(25);
    setIsPlayingAudio(true);
    setIsPausedAudio(false);
    setPlayingAyahNumber(ayahNumber);
    setAyahProgressPercent(0);

    // Update lastRead record to current Ayah
    const record = {
      surahNumber: surahDetail.number,
      ayahNumber,
      surahNameBn: surahDetail.nameBengali
    };
    setLastRead(record);
    storage.saveLastRead(record);

    // Smoothly scroll the active Ayah into view if it's outside the viewport
    setTimeout(() => {
      const el = document.getElementById(`mushaf-ayah-${ayahNumber}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isOutOfView = rect.top < 90 || rect.bottom > window.innerHeight - 160;
        if (isOutOfView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 80);

    soundManager.playAyahAudio(
      activeSurahNumber,
      ayahNumber,
      () => {
        if (repeatAyahRef.current) {
          startAyahPlayback(ayahNumber, index);
        } else if (surahDetail && index + 1 < surahDetail.ayahs.length) {
          startAyahPlayback(surahDetail.ayahs[index + 1].numberInSurah, index + 1);
        } else {
          setIsPlayingAudio(false);
          setIsPausedAudio(false);
          setPlayingAyahNumber(null);
          setAyahProgressPercent(0);
        }
      },
      () => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      }
    );
  };

  // Handle Play/Pause toggle for a specific Ayah or the whole Surah
  const handleToggleAyahAudio = (ayahNumber: number, index: number) => {
    if (isPlayingAudio && playingAyahNumber === ayahNumber) {
      triggerHaptic(20);
      soundManager.pauseAudio();
      setIsPlayingAudio(false);
      setIsPausedAudio(true);
      return;
    }

    if (isPausedAudio && playingAyahNumber === ayahNumber) {
      triggerHaptic(20);
      const resumed = soundManager.resumeAudio(() => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      });
      if (resumed) {
        setIsPlayingAudio(true);
        setIsPausedAudio(false);
        return;
      }
    }

    startAyahPlayback(ayahNumber, index);
  };

  // Primary Play/Pause handler for the bottom Mini Audio Player Overlay
  const handleToggleSurahRecitation = () => {
    if (!surahDetail || surahDetail.ayahs.length === 0) return;

    if (isPlayingAudio && playingAyahNumber !== null) {
      triggerHaptic(20);
      soundManager.pauseAudio();
      setIsPlayingAudio(false);
      setIsPausedAudio(true);
      return;
    }

    if (isPausedAudio && playingAyahNumber !== null) {
      triggerHaptic(20);
      const resumed = soundManager.resumeAudio(() => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      });
      if (resumed) {
        setIsPlayingAudio(true);
        setIsPausedAudio(false);
        return;
      }
    }

    const targetAyahNumber =
      playingAyahNumber ||
      selectedActionAyah?.numberInSurah ||
      surahDetail.ayahs[0].numberInSurah;
    const targetIdx = Math.max(
      0,
      surahDetail.ayahs.findIndex((a) => a.numberInSurah === targetAyahNumber)
    );
    startAyahPlayback(surahDetail.ayahs[targetIdx].numberInSurah, targetIdx);
  };

  // Skip to Previous Ayah in the Surah
  const handlePrevAyah = () => {
    if (!surahDetail || surahDetail.ayahs.length === 0) return;
    const currentNum = playingAyahNumber || selectedActionAyah?.numberInSurah || 1;
    const currentIdx = surahDetail.ayahs.findIndex((a) => a.numberInSurah === currentNum);
    const prevIdx = Math.max(0, (currentIdx > 0 ? currentIdx : 0) - 1);
    startAyahPlayback(surahDetail.ayahs[prevIdx].numberInSurah, prevIdx);
  };

  // Skip to Next Ayah in the Surah
  const handleNextAyah = () => {
    if (!surahDetail || surahDetail.ayahs.length === 0) return;
    const currentNum = playingAyahNumber || selectedActionAyah?.numberInSurah || 1;
    const currentIdx = surahDetail.ayahs.findIndex((a) => a.numberInSurah === currentNum);
    const nextIdx = Math.min(surahDetail.ayahs.length - 1, (currentIdx >= 0 ? currentIdx : 0) + 1);
    startAyahPlayback(surahDetail.ayahs[nextIdx].numberInSurah, nextIdx);
  };

  // Stop & Reset Recitation
  const handleStopRecitation = () => {
    triggerHaptic(20);
    soundManager.stopAudio();
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
    setPlayingAyahNumber(null);
    setAyahProgressPercent(0);
  };

  // Cycle Playback Speed (1x -> 1.25x -> 1.5x -> 0.85x -> 1x)
  const handleCyclePlaybackRate = () => {
    triggerHaptic(15);
    const rates = [1, 1.25, 1.5, 0.85];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length] || 1;
    setPlaybackRate(nextRate);
    soundManager.setPlaybackRate(nextRate);
  };

  const handleCopyAyah = (ayah: Ayah, surahName: string) => {
    const textToCopy = `${ayah.textArabic}\n\nউচ্চারণ: ${ayah.transliterationBn || ''}\nঅনুবাদ: ${ayah.textBengali}\n— সূরা ${surahName}, আয়াত: ${toBengaliDigits(ayah.numberInSurah)}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(ayah.numberInSurah);
    triggerHaptic(20);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const handleBookmarkAyah = (ayah: Ayah) => {
    if (!surahDetail) return;
    const newBookmark = {
      id: `ayah_${surahDetail.number}_${ayah.numberInSurah}`,
      type: 'ayah' as const,
      title: `সূরা ${surahDetail.nameBengali}, আয়াত: ${toBengaliDigits(ayah.numberInSurah)}`,
      subtitle: ayah.textBengali.slice(0, 60) + '...',
      reference: `কুরআন ${toBengaliDigits(surahDetail.number)}:${toBengaliDigits(ayah.numberInSurah)}`,
      dataRefId: `${surahDetail.number}:${ayah.numberInSurah}`,
      createdAt: Date.now()
    };
    saveBookmark(newBookmark);
    triggerHaptic(40);
  };

  // Filter Surahs by query
  const filteredSurahs = ALL_SURAHS_META.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      s.nameBengali.toLowerCase().includes(q) ||
      s.nameEnglish.toLowerCase().includes(q) ||
      s.meaningBengali.toLowerCase().includes(q) ||
      s.number.toString().includes(q)
    );
  });

  // Font size configuration for Mushaf Arabic lines
  const arabicFontClasses = {
    normal: 'text-[22px] sm:text-[26px] leading-[1.9]',
    large: 'text-[25px] sm:text-[30px] leading-[1.95]',
    xlarge: 'text-[28px] sm:text-[34px] leading-[2.0]'
  };

  const wordsPerLineBySize = {
    normal: 9,
    large: 7.5,
    xlarge: 6.5
  };

  // Build continuous Mushaf lines for active Surah
  const continuousMushafLines = useMemo(() => {
    if (!surahDetail) return [];
    const maxWords = wordsPerLineBySize[settings.arabicFontSize] || 8.5;
    return buildContinuousMushafLines(surahDetail, maxWords);
  }, [surahDetail, settings.arabicFontSize]);

  // Group continuous lines into real Mushaf Page Sheets (10 ruled lines per page sheet)
  const LINES_PER_MUSHAF_PAGE = 10;
  const mushafPages = useMemo(() => {
    const pages: ContinuousMushafLine[][] = [];
    for (let i = 0; i < continuousMushafLines.length; i += LINES_PER_MUSHAF_PAGE) {
      pages.push(continuousMushafLines.slice(i, i + LINES_PER_MUSHAF_PAGE));
    }
    return pages.length > 0 ? pages : [[]];
  }, [continuousMushafLines]);

  // Also build opening preview lines of the next Surah if current Surah ends with room on its last page
  const nextSurahPreviewLines = useMemo(() => {
    if (!nextSurahDetail) return [];
    const maxWords = wordsPerLineBySize[settings.arabicFontSize] || 8.5;
    return buildContinuousMushafLines(nextSurahDetail, maxWords).slice(0, 3);
  }, [nextSurahDetail, settings.arabicFontSize]);

  // -------------------------------------------------------------
  // VIEW: LOADING SURAH
  // -------------------------------------------------------------
  if (activeSurahNumber && loadingSurah && !surahDetail) {
    return (
      <div className="pb-24 pt-8 px-4 max-w-2xl mx-auto text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full border-2 border-[#177a56] border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
          কুরআন মাজীদের মুসহাফ পৃষ্ঠা লোড হচ্ছে...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: EMERALD & WHITE ILLUMINATED MUSHAF PAGES
  // -------------------------------------------------------------
  if (activeSurahNumber && surahDetail) {
    const activeAyahNumberForPlayer =
      playingAyahNumber ||
      selectedActionAyah?.numberInSurah ||
      1;
    const activeAyahObj =
      surahDetail.ayahs.find((a) => a.numberInSurah === activeAyahNumberForPlayer) ||
      surahDetail.ayahs[0];
    const surahProgressPercent =
      surahDetail.versesCount > 0
        ? Math.min(
            100,
            Math.max(
              2,
              Math.round(
                (((activeAyahNumberForPlayer - 1) + ayahProgressPercent / 100) /
                  surahDetail.versesCount) *
                  100
              )
            )
          )
        : 0;

    return (
      <div className="pb-44 pt-1.5 px-1.5 sm:px-4 max-w-3xl mx-auto space-y-4">
        {/* Sticky Top Mushaf Toolbar */}
        <div className="sticky top-14 z-20 bg-white/95 dark:bg-[#131b17]/95 backdrop-blur-md px-3 py-2 rounded-xl border border-emerald-600/30 dark:border-emerald-500/30 shadow-xs flex items-center justify-between gap-2 text-stone-900 dark:text-stone-100">
          <button
            onClick={() => {
              soundManager.stopAudio();
              setIsPlayingAudio(false);
              setIsPausedAudio(false);
              setPlayingAyahNumber(null);
              handleSurahSelect(null);
            }}
            className="flex items-center gap-1 text-xs font-extrabold text-[#177a56] dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>সূরা সূচিপত্র</span>
          </button>

          <div className="text-center truncate px-1">
            <span className="text-xs font-extrabold text-[#0d5238] dark:text-emerald-300">
              সূরা {surahDetail.nameBengali}
            </span>
            <span className="hidden sm:inline text-[11px] font-bold text-stone-500 dark:text-stone-400 ml-1.5">
              • মোট {toBengaliDigits(mushafPages.length)}টি মুসহাফ পৃষ্ঠা
            </span>
          </div>

          {/* Audio, Transliteration & Font Size Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleToggleSurahRecitation}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer border ${
                isPlayingAudio
                  ? 'bg-[#177a56] text-white border-[#0d5238]'
                  : 'bg-emerald-50 dark:bg-emerald-950/70 text-[#177a56] dark:text-emerald-300 border-emerald-600/30 hover:bg-emerald-100'
              }`}
              title="তিলাওয়াত শুনুন"
            >
              {isPlayingAudio ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlayingAudio ? 'চলছে' : isPausedAudio ? 'বিরতি' : 'তিলাওয়াত'}</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic(15);
                setShowTranslit(prev => !prev);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer border ${
                showTranslit
                  ? 'bg-[#177a56] text-white border-[#177a56]'
                  : 'bg-emerald-50/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-emerald-600/25 dark:border-stone-700'
              }`}
              title="বাংলা উচ্চারণ চালু/বন্ধ করুন"
            >
              উচ্চারণ
            </button>

            <button
              onClick={() => {
                const nextSize = settings.arabicFontSize === 'normal' ? 'large' : settings.arabicFontSize === 'large' ? 'xlarge' : 'normal';
                onUpdateSettings({ arabicFontSize: nextSize });
              }}
              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-stone-800 text-[#177a56] dark:text-emerald-300 text-xs cursor-pointer border border-emerald-600/25 dark:border-stone-700"
              title="আরবি ফন্টের আকার পরিবর্তন"
            >
              <Type className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Ayah Floating Action Bar */}
        {selectedActionAyah && (
          <div className="sticky top-28 z-20 rounded-xl bg-[#0d5238] text-white px-3 py-2 border border-emerald-400/60 shadow-md flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-emerald-100">
              সূরা {surahDetail.nameBengali} • আয়াত {toBengaliDigits(selectedActionAyah.numberInSurah)}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const idx = surahDetail.ayahs.findIndex(a => a.numberInSurah === selectedActionAyah.numberInSurah);
                  handleToggleAyahAudio(selectedActionAyah.numberInSurah, idx >= 0 ? idx : 0);
                }}
                className="px-2.5 py-1 rounded-lg bg-white text-[#0d5238] font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                {isPlayingAudio && playingAyahNumber === selectedActionAyah.numberInSurah ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                <span>তিলাওয়াত</span>
              </button>
              <button
                onClick={() => handleCopyAyah(selectedActionAyah, surahDetail.nameBengali)}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                {isCopied === selectedActionAyah.numberInSurah ? (
                  <Check className="w-3 h-3 text-emerald-300" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>কপি</span>
              </button>
              <button
                onClick={() => handleBookmarkAyah(selectedActionAyah)}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Bookmark className="w-3 h-3" />
                <span>বুকমার্ক</span>
              </button>
              <button
                onClick={() =>
                  onOpenShareModal({
                    title: `সূরা ${surahDetail.nameBengali}`,
                    arabic: selectedActionAyah.textArabic,
                    translation: selectedActionAyah.textBengali,
                    reference: `আল-কুরআন, সূরা ${surahDetail.nameBengali} (${toBengaliDigits(surahDetail.number)}:${toBengaliDigits(selectedActionAyah.numberInSurah)})`
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>শেয়ার</span>
              </button>
              <button
                onClick={() => setSelectedActionAyah(null)}
                className="px-2 py-1 rounded-lg bg-white/10 text-emerald-200 font-bold text-[11px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* RENDER ALL MUSHAF PAGES OF THE SURAH                             */}
        {/* ================================================================ */}
        <div className="space-y-6">
          {mushafPages.map((pageLines, pageIdx) => {
            const isFirstPage = pageIdx === 0;
            const isLastPage = pageIdx === mushafPages.length - 1;
            const showNextSurahOnSamePage =
              isLastPage &&
              nextSurahDetail &&
              pageLines.length <= 7;

            return (
              <MushafIlluminatedPageFrame
                key={`mushaf_page_${surahDetail.number}_${pageIdx + 1}`}
                topLeftHeaderAr={`سُورَةُ ${surahDetail.nameArabic}`}
                topLeftHeaderBn={`সূরা ${surahDetail.nameBengali}`}
                topRightHeaderAr={`الْجُزْءُ ${toArabicDigits(surahDetail.juzNumber)}`}
                topRightHeaderBn={`পারা ${toBengaliDigits(surahDetail.juzNumber)}`}
                pageNumber={pageIdx + 1}
                totalPages={mushafPages.length}
                marginalBadgeText={`পারা ${toBengaliDigits(surahDetail.juzNumber)}`}
              >
                {/* 1. First Page of Surah: Ornate Emerald & Mint Surah Header Cartouche */}
                {isFirstPage && (
                  <>
                    <IlluminatedSurahCartouche
                      nameArabic={surahDetail.nameArabic}
                      nameBengali={surahDetail.nameBengali}
                      meaningBengali={surahDetail.meaningBengali}
                      versesCount={surahDetail.versesCount}
                      surahNumber={surahDetail.number}
                      revelationType={surahDetail.revelationType}
                    />

                    {/* Bismillah Ruled Row + Thin Bengali Translation */}
                    {surahDetail.bismillahPre && (
                      <div className="border-b-[1.5px] border-[#177a56]/40 dark:border-emerald-600/40">
                        <div className="py-1.5 sm:py-2 px-3 text-center bg-white dark:bg-[#111915]" dir="rtl">
                          <p className="font-arabic text-2xl sm:text-3xl font-bold text-[#0b4630] dark:text-emerald-200 leading-snug select-text">
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                          </p>
                        </div>
                        <div className="py-1 px-3 text-center bg-[#eaf6f0] dark:bg-[#16231c] border-t border-emerald-600/20 dark:border-emerald-500/20">
                          <p className="text-[11px] sm:text-xs font-semibold text-[#0d5238] dark:text-emerald-300 leading-snug">
                            পরম করুণাময় ও অসীম দয়ালু আল্লাহর নামে শুরু করছি
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 2. Continuous Ruled Mushaf Lines + Thin Interlinear Translation */}
                <div className="divide-y-[1.5px] divide-[#177a56]/35 dark:divide-emerald-600/30">
                  {pageLines.map((line) => {
                    const hasPlayingAyah = line.distinctAyahsInLine.some(
                      (d) => isPlayingAudio && playingAyahNumber === d.ayah.numberInSurah
                    );

                    return (
                      <div
                        key={`line_${line.lineNumberInSurah}`}
                        className={`transition-colors ${
                          hasPlayingAyah
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/50'
                            : 'bg-white dark:bg-[#111915]'
                        }`}
                      >
                        {/* TOP BAND: Continuous Justified Arabic Mushaf Line (উপরে আরবি) */}
                        <div
                          dir="rtl"
                          onClick={() => {
                            triggerHaptic(10);
                            setSelectedActionAyah(line.primaryAyah);
                          }}
                          className={`px-2.5 sm:px-4 pt-2 pb-1.5 font-arabic text-stone-900 dark:text-stone-100 select-text cursor-pointer ${
                            arabicFontClasses[settings.arabicFontSize]
                          } ${
                            line.isLastLineOfSurah
                              ? 'text-center'
                              : 'text-justify [text-align-last:justify]'
                          }`}
                        >
                          {line.tokens.map((tk, tkIdx) => {
                            const isThisAyahPlaying =
                              isPlayingAudio && playingAyahNumber === tk.ayah.numberInSurah;
                            const isThisAyahSelected =
                              selectedActionAyah?.numberInSurah === tk.ayah.numberInSurah;

                            return (
                              <React.Fragment key={`${tk.ayah.numberInSurah}_${tkIdx}`}>
                                <span
                                  id={tk.isStartOfAyah ? `mushaf-ayah-${tk.ayah.numberInSurah}` : undefined}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic(10);
                                    setSelectedActionAyah(tk.ayah);
                                  }}
                                  className={`rounded px-0.5 transition-colors ${
                                    isThisAyahPlaying
                                      ? 'bg-emerald-500/20 text-[#0d5238] dark:text-emerald-300'
                                      : isThisAyahSelected
                                      ? 'bg-emerald-500/15 text-[#0d5238] dark:text-emerald-300'
                                      : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                                  }`}
                                >
                                  {tk.arabicWord}
                                </span>{' '}
                                {tk.isEndOfAyah && (
                                  <MushafAyahMedallion
                                    number={tk.ayah.numberInSurah}
                                    isActive={isThisAyahPlaying || isThisAyahSelected}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerHaptic(15);
                                      setSelectedActionAyah(tk.ayah);
                                    }}
                                  />
                                )}{' '}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* OPTIONAL TRANSLITERATION THIN STRIP */}
                        {showTranslit && line.combinedTranslitText && (
                          <div className="px-2.5 sm:px-4 py-0.5 bg-[#f3faf6] dark:bg-[#14201a] border-t border-dashed border-emerald-600/25 text-center">
                            <p className="text-[10.5px] sm:text-[11.5px] text-[#177a56] dark:text-emerald-400 italic font-semibold leading-snug">
                              {line.combinedTranslitText}
                            </p>
                          </div>
                        )}

                        {/* BOTTOM THIN BAND: Extra Bengali Translation Line (নিচের চিকন লাইন অনুবাদ) */}
                        <div
                          onClick={() => {
                            triggerHaptic(10);
                            setSelectedActionAyah(line.primaryAyah);
                          }}
                          className="px-2.5 sm:px-4 py-1 bg-[#edf7f2] dark:bg-[#16231c] border-t border-emerald-600/20 dark:border-emerald-500/20 text-center cursor-pointer hover:bg-emerald-100/60 dark:hover:bg-emerald-950/60 transition-colors"
                        >
                          <p className="text-[11px] sm:text-[12.5px] text-stone-800 dark:text-stone-200 font-semibold leading-snug select-text">
                            {line.combinedBengaliText}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 3. When a short Surah finishes on the page, the next Surah's Illuminated Banner & opening verses begin right below */}
                {showNextSurahOnSamePage && nextSurahDetail && (
                  <div
                    onClick={() => handleSurahSelect(nextSurahDetail.number)}
                    className="cursor-pointer group"
                    title={`সূরা ${nextSurahDetail.nameBengali} সম্পূর্ণ পড়তে ট্যাপ করুন`}
                  >
                    <IlluminatedSurahCartouche
                      nameArabic={nextSurahDetail.nameArabic}
                      nameBengali={nextSurahDetail.nameBengali}
                      meaningBengali={nextSurahDetail.meaningBengali}
                      versesCount={nextSurahDetail.versesCount}
                      surahNumber={nextSurahDetail.number}
                      revelationType={nextSurahDetail.revelationType}
                    />

                    {nextSurahDetail.bismillahPre && (
                      <div className="border-b-[1.5px] border-[#177a56]/40 dark:border-emerald-600/40">
                        <div className="py-1.5 px-3 text-center bg-white dark:bg-[#111915]" dir="rtl">
                          <p className="font-arabic text-2xl sm:text-3xl font-bold text-[#0b4630] dark:text-emerald-200 leading-snug">
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                          </p>
                        </div>
                        <div className="py-1 px-3 text-center bg-[#eaf6f0] dark:bg-[#16231c] border-t border-emerald-600/20 dark:border-emerald-500/20">
                          <p className="text-[11px] sm:text-xs font-semibold text-[#0d5238] dark:text-emerald-300 leading-snug">
                            পরম করুণাময় ও অসীম দয়ালু আল্লাহর নামে শুরু করছি
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="divide-y-[1.5px] divide-[#177a56]/35 dark:divide-emerald-600/30">
                      {nextSurahPreviewLines.map((pLine) => (
                        <div key={`next_preview_${pLine.lineNumberInSurah}`} className="bg-white dark:bg-[#111915]">
                          <div
                            dir="rtl"
                            className={`px-2.5 sm:px-4 pt-2 pb-1.5 font-arabic text-stone-900 dark:text-stone-100 ${
                              arabicFontClasses[settings.arabicFontSize]
                            } ${
                              pLine.isLastLineOfSurah
                                ? 'text-center'
                                : 'text-justify [text-align-last:justify]'
                            }`}
                          >
                            {pLine.tokens.map((tk, tkIdx) => (
                              <React.Fragment key={`next_${tk.ayah.numberInSurah}_${tkIdx}`}>
                                <span>{tk.arabicWord}</span>{' '}
                                {tk.isEndOfAyah && <MushafAyahMedallion number={tk.ayah.numberInSurah} />}{' '}
                              </React.Fragment>
                            ))}
                          </div>
                          <div className="px-2.5 sm:px-4 py-1 bg-[#edf7f2] dark:bg-[#16231c] border-t border-emerald-600/20 dark:border-emerald-500/20 text-center">
                            <p className="text-[11px] sm:text-[12.5px] text-stone-800 dark:text-stone-200 font-semibold leading-snug">
                              {pLine.combinedBengaliText}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="py-1.5 px-3 bg-[#0d5238] text-white text-center text-xs font-extrabold flex items-center justify-center gap-1.5">
                      <span>সূরা {nextSurahDetail.nameBengali} সম্পূর্ণ পৃষ্ঠা খুলুন</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                )}
              </MushafIlluminatedPageFrame>
            );
          })}
        </div>

        {/* Bottom Surah Navigation Bar */}
        <div className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#131b17] border border-emerald-600/30 dark:border-emerald-500/30 flex items-center justify-between text-xs font-extrabold text-[#177a56] dark:text-emerald-400 shadow-xs">
          <button
            disabled={surahDetail.number <= 1}
            onClick={() => surahDetail.number > 1 && handleSurahSelect(surahDetail.number - 1)}
            className="flex items-center gap-1 disabled:opacity-40 hover:underline cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>পূর্ববর্তী সূরা</span>
          </button>

          <span className="font-arabic text-base text-[#0d5238] dark:text-emerald-300">
            صَدَقَ اللَّهُ الْعَظِيمُ
          </span>

          <button
            disabled={surahDetail.number >= 114}
            onClick={() => surahDetail.number < 114 && handleSurahSelect(surahDetail.number + 1)}
            className="flex items-center gap-1 disabled:opacity-40 hover:underline cursor-pointer disabled:cursor-not-allowed"
          >
            <span>পরবর্তী সূরা</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ================================================================ */}
        {/* MINI AUDIO PLAYER OVERLAY AT BOTTOM OF QURAN READER SCREEN       */}
        {/* ================================================================ */}
        <div
          role="region"
          aria-label="কুরআন তিলাওয়াত মিনি অডিও প্লেয়ার"
          className="fixed bottom-[68px] left-0 right-0 z-30 px-2.5 sm:px-4 pointer-events-none"
        >
          <div className="max-w-xl mx-auto pointer-events-auto rounded-2xl bg-white/95 dark:bg-[#111915]/95 backdrop-blur-xl border-2 border-[#177a56]/45 dark:border-emerald-500/40 shadow-[0_-8px_30px_rgba(13,82,56,0.18)] overflow-hidden">
            {/* Top Interactive Surah & Ayah Progress Bar (Tap anywhere to scrub to an Ayah) */}
            <div
              onClick={(e) => {
                if (!surahDetail || surahDetail.versesCount === 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const targetIdx = Math.min(
                  surahDetail.ayahs.length - 1,
                  Math.floor(ratio * surahDetail.ayahs.length)
                );
                startAyahPlayback(surahDetail.ayahs[targetIdx].numberInSurah, targetIdx);
              }}
              title="যেকোনো আয়াতে যেতে প্রোগ্রেস বারে ট্যাপ করুন"
              className="relative h-1.5 w-full bg-emerald-100 dark:bg-emerald-950 cursor-pointer group"
            >
              <div
                className="h-full bg-gradient-to-r from-[#0d5238] via-[#177a56] to-emerald-400 transition-all duration-200"
                style={{ width: `${surahProgressPercent}%` }}
              />
            </div>

            <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2.5">
              {/* Left: Recitation Status Icon + Current Surah & Ayah Info */}
              <div
                onClick={() => {
                  const el = document.getElementById(`mushaf-ayah-${activeAyahNumberForPlayer}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                title="পঠিত আয়াতে স্ক্রল করতে ট্যাপ করুন"
              >
                {/* Animated Equalizer / Audio Badge */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors border ${
                    isPlayingAudio
                      ? 'bg-gradient-to-br from-[#0d5238] to-[#177a56] text-white border-emerald-400/50 shadow-xs'
                      : isPausedAudio
                      ? 'bg-emerald-100 dark:bg-emerald-950/90 text-[#0d5238] dark:text-emerald-300 border-emerald-500/40'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 border-emerald-600/25'
                  }`}
                >
                  {isPlayingAudio ? (
                    <div className="flex items-end gap-0.5 h-3.5">
                      <span className="w-0.5 h-full bg-emerald-200 rounded-full animate-pulse" />
                      <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" />
                      <span className="w-0.5 h-3 bg-emerald-200 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  )}
                </div>

                {/* Surah Name, Active Ayah Counter & Reciter Subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 truncate">
                      সূরা {surahDetail.nameBengali}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-600/30 text-[10px] font-extrabold text-[#0d5238] dark:text-emerald-300 font-mono shrink-0">
                      আয়াত {toBengaliDigits(activeAyahNumberForPlayer)}/{toBengaliDigits(surahDetail.versesCount)}
                    </span>
                  </div>

                  <p className="text-[10.5px] sm:text-xs font-semibold text-stone-600 dark:text-stone-400 truncate mt-0.5">
                    {isPlayingAudio
                      ? activeAyahObj?.textBengali || 'তিলাওয়াত চলছে — কারী মিশারি আল-আফাসি'
                      : isPausedAudio
                      ? `বিরতি দেওয়া হয়েছে • আয়াত ${toBengaliDigits(activeAyahNumberForPlayer)}`
                      : 'তিলাওয়াত শুনতে প্লে চাপুন • কারী মিশারি আল-আফাসি'}
                  </p>
                </div>
              </div>

              {/* Right: Transport Controls (Prev Ayah, Play/Pause, Next Ayah, Repeat, Speed, Stop) */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Repeat Current Ayah Toggle */}
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    setRepeatAyahMode((prev) => !prev);
                  }}
                  title={repeatAyahMode ? 'একই আয়াত পুনরাবৃত্তি চালু আছে' : 'একই আয়াত বারবার শুনুন'}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    repeatAyahMode
                      ? 'bg-[#177a56] text-white border-[#0d5238]'
                      : 'bg-emerald-50/70 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 border-emerald-600/20 hover:text-[#177a56]'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>

                {/* Previous Ayah Button */}
                <button
                  onClick={handlePrevAyah}
                  disabled={activeAyahNumberForPlayer <= 1}
                  title="পূর্ববর্তী আয়াত"
                  className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-stone-800/90 text-[#0d5238] dark:text-emerald-300 border border-emerald-600/25 disabled:opacity-40 hover:bg-emerald-100 dark:hover:bg-stone-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Primary Play / Pause Surah Recitation Button */}
                <button
                  onClick={handleToggleSurahRecitation}
                  aria-label={isPlayingAudio ? 'তিলাওয়াত বিরতি দিন' : 'তিলাওয়াত চালু করুন'}
                  title={isPlayingAudio ? 'তিলাওয়াত বিরতি দিন (Pause)' : 'তিলাওয়াত চালু করুন (Play)'}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-[#177a56] to-[#0d5238] hover:from-[#1b8c63] hover:to-[#0f5f41] text-white shadow-sm border border-emerald-400/50 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-white ml-0.5" />
                  )}
                </button>

                {/* Next Ayah Button */}
                <button
                  onClick={handleNextAyah}
                  disabled={activeAyahNumberForPlayer >= surahDetail.versesCount}
                  title="পরবর্তী আয়াত"
                  className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-stone-800/90 text-[#0d5238] dark:text-emerald-300 border border-emerald-600/25 disabled:opacity-40 hover:bg-emerald-100 dark:hover:bg-stone-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Playback Speed Button */}
                <button
                  onClick={handleCyclePlaybackRate}
                  title="তিলাওয়াতের গতি পরিবর্তন করুন"
                  className="hidden xs:inline-flex px-1.5 py-1 rounded-lg bg-emerald-50/80 dark:bg-stone-800/80 border border-emerald-600/25 text-[10px] font-mono font-extrabold text-[#0d5238] dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  {playbackRate}x
                </button>

                {/* Stop Button (visible when playing or paused) */}
                {(isPlayingAudio || isPausedAudio) && (
                  <button
                    onClick={handleStopRecitation}
                    title="তিলাওয়াত বন্ধ করুন"
                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: 114 SURAHS DIRECTORY — STYLED IN APP'S EMERALD & WHITE MUSHAF THEME
  // -------------------------------------------------------------
  return (
    <div className="pb-24 pt-2 px-2 sm:px-4 max-w-3xl mx-auto space-y-3">
      {/* Search & Last Read Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[#177a56] dark:text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="সূরা খুঁজুন (নাম, অর্থ বা নম্বর)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#131b17] border border-emerald-600/30 dark:border-emerald-500/30 text-sm sm:text-base focus:outline-none focus:border-[#177a56] text-stone-900 dark:text-stone-100 placeholder-stone-400 font-semibold shadow-2xs"
          />
        </div>

        {/* Last Read Quick Resume Bar */}
        {lastRead && (
          <div 
            onClick={() => handleSurahSelect(lastRead.surahNumber)}
            className="cursor-pointer p-3 rounded-xl bg-gradient-to-r from-[#0d5238] via-[#177a56] to-[#0d5238] border border-emerald-400/40 text-white flex items-center justify-between transition-transform active:scale-[0.99] shadow-xs"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <BookOpen className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="text-emerald-100 font-medium">সর্বশেষ পঠিত মুসহাফ পৃষ্ঠা:</span>
              <strong className="text-white font-extrabold">সূরা {lastRead.surahNameBn}</strong>
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-100 flex items-center gap-1">
              পড়ুন <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        )}
      </div>

      {/* Illuminated Emerald & White Mushaf Index Frame for all 114 Surahs */}
      <MushafIlluminatedPageFrame
        topLeftHeaderAr="فِهْرِسُ السُّوَرِ"
        topLeftHeaderBn="সূরা সূচিপত্র"
        topRightHeaderAr="الْقُرْآنُ الْكَرِيمُ"
        topRightHeaderBn="আল-কুরআনুল কারীম"
        pageNumber={1}
        marginalBadgeText="১১৪ সূরা"
      >
        <IlluminatedSurahCartouche
          nameArabic="فِهْرِسُ الْقُرْآنِ الْكَرِيمِ"
          nameBengali="কুরআন মাজীদের সূচিপত্র"
          meaningBengali="সকল সূরা ও বাংলা অনুবাদ"
          versesCount={6236}
          surahNumber={114}
          revelationType="৩০ পারা"
        />

        <div className="divide-y-[1.5px] divide-[#177a56]/30 dark:divide-emerald-600/25">
          {filteredSurahs.map((surah) => (
            <div
              key={surah.number}
              onClick={() => handleSurahSelect(surah.number)}
              className="cursor-pointer px-3 sm:px-4 py-2.5 bg-white dark:bg-[#111915] hover:bg-[#edf7f2] dark:hover:bg-emerald-950/50 transition-colors flex items-center justify-between gap-2 group list-item-optimized"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <MushafAyahMedallion number={surah.number} />
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 truncate">
                    <span>সূরা {surah.nameBengali}</span>
                    <span className="text-xs font-semibold text-[#177a56] dark:text-emerald-400">
                      ({surah.meaningBengali})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 font-semibold">
                    <span>পারা {toBengaliDigits(surah.juzNumber)}</span>
                    <span>•</span>
                    <span>{toBengaliDigits(surah.versesCount)} আয়াত</span>
                    <span>•</span>
                    <span>{surah.revelationType}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-arabic text-xl sm:text-2xl text-[#0d5238] dark:text-emerald-300 font-bold">
                  سُورَةُ {surah.nameArabic}
                </span>
                <ChevronRight className="w-4 h-4 text-[#177a56] dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}

          {filteredSurahs.length === 0 && (
            <div className="text-center py-12 text-stone-500 text-sm font-bold">
              কোনো সূরা পাওয়া যায়নি
            </div>
          )}
        </div>
      </MushafIlluminatedPageFrame>
    </div>
  );
});
