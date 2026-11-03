import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  Coins,
  Wallet,
  Briefcase,
  MinusCircle,
  CheckCircle2,
  RotateCcw,
  Copy,
  Check,
  Info,
  Sparkles,
  Scale,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { toBengaliDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

const STORAGE_KEY = 'waqto_zakat_calculator_v1';
const LIVE_RATE_CACHE_KEY = 'waqto_live_metal_rates_v1';

// 1 Vori (Tola) = 11.6638038 grams; 1 Troy Ounce = 31.1034768 grams => 1 Vori = 0.375 Troy Ounce
const VORI_PER_TROY_OUNCE = 11.6638038 / 31.1034768; // 0.375

export type MetalCarat = '22k' | '21k' | '18k' | 'traditional';

const CARAT_OPTIONS: { id: MetalCarat; labelBn: string; goldPurity: number; silverPurity: number }[] = [
  { id: '22k', labelBn: '২২ ক্যারেট', goldPurity: 22 / 24, silverPurity: 22 / 24 },
  { id: '21k', labelBn: '২১ ক্যারেট', goldPurity: 21 / 24, silverPurity: 21 / 24 },
  { id: '18k', labelBn: '১৮ ক্যারেট', goldPurity: 18 / 24, silverPurity: 18 / 24 },
  { id: 'traditional', labelBn: 'সনাতন', goldPurity: 0.65, silverPurity: 0.75 }
];

interface LiveMetalBaseRates {
  gold24kPerVoriBdt: number;
  silver24kPerVoriBdt: number;
  updatedAt: string;
  sourceDate?: string;
}

interface ZakatFormState {
  nisabBasis: 'silver' | 'gold';
  metalCarat: MetalCarat;
  autoUpdateRate: boolean;
  silverPricePerVori: number;
  goldPricePerVori: number;
  // Cash & Bank
  cashInHand: number;
  bankBalance: number;
  mobileBanking: number;
  // Gold & Silver (either by BDT value or Vori weight)
  metalInputMode: 'value' | 'weight';
  goldValueBdt: number;
  silverValueBdt: number;
  goldWeightVori: number;
  silverWeightVori: number;
  // Investments & Business
  fdrDpsSavings: number;
  sharesInvestments: number;
  businessMerchandise: number;
  receivableLoans: number;
  otherAssets: number;
  // Liabilities / Debts
  personalDebts: number;
  businessDues: number;
  otherLiabilities: number;
}

const DEFAULT_STATE: ZakatFormState = {
  nisabBasis: 'silver',
  metalCarat: '22k',
  autoUpdateRate: true,
  silverPricePerVori: 2600, // ~2,600 BDT per Vori silver
  goldPricePerVori: 142000, // ~1,42,000 BDT per Vori gold
  cashInHand: 0,
  bankBalance: 0,
  mobileBanking: 0,
  metalInputMode: 'value',
  goldValueBdt: 0,
  silverValueBdt: 0,
  goldWeightVori: 0,
  silverWeightVori: 0,
  fdrDpsSavings: 0,
  sharesInvestments: 0,
  businessMerchandise: 0,
  receivableLoans: 0,
  otherAssets: 0,
  personalDebts: 0,
  businessDues: 0,
  otherLiabilities: 0
};

function computeCaratPrices(
  base24kGoldVori: number,
  base24kSilverVori: number,
  carat: MetalCarat
): { goldPricePerVori: number; silverPricePerVori: number } {
  const option = CARAT_OPTIONS.find((c) => c.id === carat) || CARAT_OPTIONS[0];
  // Local Bangladesh market (BAJUS) duty/refining factor (~1.06)
  const localMarketFactor = 1.06;
  const rawGold = base24kGoldVori * option.goldPurity * localMarketFactor;
  const rawSilver = base24kSilverVori * option.silverPurity * localMarketFactor;
  return {
    goldPricePerVori: Math.max(10000, Math.round(rawGold / 100) * 100),
    silverPricePerVori: Math.max(500, Math.round(rawSilver / 10) * 10)
  };
}

async function fetchLiveMetalBaseRatesBdt(): Promise<LiveMetalBaseRates | null> {
  // Primary Source: @fawazahmed0/currency-api (jsDelivr CDN & Cloudflare Pages fallback)
  const endpoints = [
    {
      xau: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json',
      xag: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json'
    },
    {
      xau: 'https://latest.currency-api.pages.dev/v1/currencies/xau.json',
      xag: 'https://latest.currency-api.pages.dev/v1/currencies/xag.json'
    }
  ];

  for (const ep of endpoints) {
    try {
      const [xauRes, xagRes] = await Promise.all([
        fetch(ep.xau, { cache: 'no-store' }),
        fetch(ep.xag, { cache: 'no-store' })
      ]);
      if (xauRes.ok && xagRes.ok) {
        const xauData = await xauRes.json();
        const xagData = await xagRes.json();
        const xauBdtPerOz = Number(xauData?.xau?.bdt);
        const xagBdtPerOz = Number(xagData?.xag?.bdt);
        if (xauBdtPerOz > 50000 && xagBdtPerOz > 500) {
          return {
            gold24kPerVoriBdt: xauBdtPerOz * VORI_PER_TROY_OUNCE,
            silver24kPerVoriBdt: xagBdtPerOz * VORI_PER_TROY_OUNCE,
            updatedAt: new Date().toISOString(),
            sourceDate: xauData?.date
          };
        }
      }
    } catch {}
  }

  // Secondary Source: gold-api.com (Spot USD) + open.er-api.com (USD -> BDT)
  try {
    const [goldRes, silverRes, fxRes] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU', { cache: 'no-store' }),
      fetch('https://api.gold-api.com/price/XAG', { cache: 'no-store' }),
      fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })
    ]);
    if (goldRes.ok && silverRes.ok && fxRes.ok) {
      const goldJson = await goldRes.json();
      const silverJson = await silverRes.json();
      const fxJson = await fxRes.json();
      const bdtPerUsd = Number(fxJson?.rates?.BDT) || 121.5;
      const goldUsdOz = Number(goldJson?.price);
      const silverUsdOz = Number(silverJson?.price);
      if (goldUsdOz > 1000 && silverUsdOz > 10) {
        return {
          gold24kPerVoriBdt: goldUsdOz * bdtPerUsd * VORI_PER_TROY_OUNCE,
          silver24kPerVoriBdt: silverUsdOz * bdtPerUsd * VORI_PER_TROY_OUNCE,
          updatedAt: new Date().toISOString()
        };
      }
    }
  } catch {}

  return null;
}

function formatBdtBn(amount: number): string {
  const rounded = Math.round(amount);
  return '৳ ' + toBengaliDigits(rounded.toLocaleString('en-IN'));
}

export const ZakatCalculatorView: React.FC = React.memo(() => {
  const [form, setForm] = useState<ZakatFormState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          metalCarat: parsed.metalCarat || '22k',
          autoUpdateRate: parsed.autoUpdateRate !== undefined ? Boolean(parsed.autoUpdateRate) : true,
          silverPricePerVori:
            parsed.silverPricePerVori && parsed.silverPricePerVori >= 500
              ? parsed.silverPricePerVori
              : DEFAULT_STATE.silverPricePerVori,
          goldPricePerVori:
            parsed.goldPricePerVori && parsed.goldPricePerVori >= 10000
              ? parsed.goldPricePerVori
              : DEFAULT_STATE.goldPricePerVori
        };
      }
    } catch {}
    return DEFAULT_STATE;
  });

  const [liveRates, setLiveRates] = useState<LiveMetalBaseRates | null>(() => {
    try {
      const cached = localStorage.getItem(LIVE_RATE_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMasayel, setShowMasayel] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const syncLiveMarketRates = useCallback(
    async (forceApplyToForm: boolean = false, targetCarat?: MetalCarat) => {
      setIsFetchingRates(true);
      try {
        const fetched = await fetchLiveMetalBaseRatesBdt();
        if (fetched) {
          setLiveRates(fetched);
          try {
            localStorage.setItem(LIVE_RATE_CACHE_KEY, JSON.stringify(fetched));
          } catch {}

          setForm((prev) => {
            const shouldUpdate = forceApplyToForm || prev.autoUpdateRate;
            if (!shouldUpdate) return prev;
            const activeCarat = targetCarat || prev.metalCarat || '22k';
            const computed = computeCaratPrices(
              fetched.gold24kPerVoriBdt,
              fetched.silver24kPerVoriBdt,
              activeCarat
            );
            return {
              ...prev,
              metalCarat: activeCarat,
              autoUpdateRate: true,
              goldPricePerVori: computed.goldPricePerVori,
              silverPricePerVori: computed.silverPricePerVori
            };
          });
        }
      } finally {
        setIsFetchingRates(false);
      }
    },
    []
  );

  // Automatically fetch live gold & silver prices on mount, window focus, and every 15 minutes
  useEffect(() => {
    syncLiveMarketRates(false);

    const intervalId = window.setInterval(() => {
      syncLiveMarketRates(false);
    }, 15 * 60 * 1000);

    const handleFocus = () => {
      syncLiveMarketRates(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncLiveMarketRates]);

  const updateField = <K extends keyof ZakatFormState>(key: K, value: ZakatFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCaratSelect = (carat: MetalCarat) => {
    triggerHaptic(15);
    if (liveRates) {
      const computed = computeCaratPrices(
        liveRates.gold24kPerVoriBdt,
        liveRates.silver24kPerVoriBdt,
        carat
      );
      setForm((prev) => ({
        ...prev,
        metalCarat: carat,
        autoUpdateRate: true,
        goldPricePerVori: computed.goldPricePerVori,
        silverPricePerVori: computed.silverPricePerVori
      }));
    } else {
      updateField('metalCarat', carat);
      syncLiveMarketRates(true, carat);
    }
  };

  const handleNumInput = (key: keyof ZakatFormState, rawValue: string) => {
    const cleaned = rawValue.replace(/[^0-9.]/g, '');
    const parsed = cleaned === '' ? 0 : Math.max(0, parseFloat(cleaned));
    const numericVal = isNaN(parsed) ? 0 : parsed;
    if (key === 'goldPricePerVori' || key === 'silverPricePerVori') {
      // User manually edited rate, switch autoUpdateRate to false until they re-enable live sync
      setForm((prev) => ({
        ...prev,
        autoUpdateRate: false,
        [key]: numericVal
      }));
    } else {
      updateField(key, numericVal as any);
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    // 52.5 Vori (Tola) Silver or 7.5 Vori (Tola) Gold
    const silverNisabBdt = 52.5 * (form.silverPricePerVori || 0);
    const goldNisabBdt = 7.5 * (form.goldPricePerVori || 0);
    const activeNisabBdt = form.nisabBasis === 'silver' ? silverNisabBdt : goldNisabBdt;

    const totalCash = (form.cashInHand || 0) + (form.bankBalance || 0) + (form.mobileBanking || 0);

    const computedGoldValue =
      form.metalInputMode === 'weight'
        ? (form.goldWeightVori || 0) * (form.goldPricePerVori || 0)
        : form.goldValueBdt || 0;

    const computedSilverValue =
      form.metalInputMode === 'weight'
        ? (form.silverWeightVori || 0) * (form.silverPricePerVori || 0)
        : form.silverValueBdt || 0;

    const totalMetals = computedGoldValue + computedSilverValue;

    const totalInvestmentsAndBusiness =
      (form.fdrDpsSavings || 0) +
      (form.sharesInvestments || 0) +
      (form.businessMerchandise || 0) +
      (form.receivableLoans || 0) +
      (form.otherAssets || 0);

    const totalAssets = totalCash + totalMetals + totalInvestmentsAndBusiness;

    const totalLiabilities =
      (form.personalDebts || 0) + (form.businessDues || 0) + (form.otherLiabilities || 0);

    const netZakatableWealth = Math.max(0, totalAssets - totalLiabilities);
    const isZakatEligible = activeNisabBdt > 0 && netZakatableWealth >= activeNisabBdt;
    const payableZakat = isZakatEligible ? netZakatableWealth * 0.025 : 0;
    const monthlyEquivalent = payableZakat / 12;

    return {
      silverNisabBdt,
      goldNisabBdt,
      activeNisabBdt,
      totalCash,
      computedGoldValue,
      computedSilverValue,
      totalMetals,
      totalInvestmentsAndBusiness,
      totalAssets,
      totalLiabilities,
      netZakatableWealth,
      isZakatEligible,
      payableZakat,
      monthlyEquivalent
    };
  }, [form]);

  const handleReset = () => {
    triggerHaptic(25);
    if (liveRates) {
      const computed = computeCaratPrices(
        liveRates.gold24kPerVoriBdt,
        liveRates.silver24kPerVoriBdt,
        '22k'
      );
      setForm({
        ...DEFAULT_STATE,
        autoUpdateRate: true,
        metalCarat: '22k',
        goldPricePerVori: computed.goldPricePerVori,
        silverPricePerVori: computed.silverPricePerVori
      });
    } else {
      setForm(DEFAULT_STATE);
      syncLiveMarketRates(true, '22k');
    }
  };

  const handleCopySummary = () => {
    triggerHaptic(20);
    const summaryText = [
      '🌙 Muslim Reminder (মুসলিম রিমাইন্ডার) — যাকাত হিসাব বিবরণী',
      `হিসাব মানদণ্ড: ${form.nisabBasis === 'silver' ? '৫২.৫ ভরি রুপা' : '৭.৫ ভরি স্বর্ণ'} (${formatBdtBn(calculations.activeNisabBdt)})`,
      `• নগদ ও ব্যাংক জমা: ${formatBdtBn(calculations.totalCash)}`,
      `• স্বর্ণ ও রৌপ্য মূল্য: ${formatBdtBn(calculations.totalMetals)}`,
      `• ব্যবসা ও বিনিয়োগ: ${formatBdtBn(calculations.totalInvestmentsAndBusiness)}`,
      `মোট যাকাতযোগ্য সম্পদ: ${formatBdtBn(calculations.totalAssets)}`,
      `বাদযোগ্য ঋণ ও দায়: (-) ${formatBdtBn(calculations.totalLiabilities)}`,
      `নিট যাকাতযোগ্য সম্পদ: ${formatBdtBn(calculations.netZakatableWealth)}`,
      `প্রদেয় যাকাত (২.৫%): ${formatBdtBn(calculations.payableZakat)}`
    ].join('\n');

    navigator.clipboard?.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const renderAmountField = (
    labelBn: string,
    subBn: string,
    fieldKey: keyof ZakatFormState,
    placeholder: string = '0',
    unitLabel: string = '৳'
  ) => {
    const val = form[fieldKey] as number;
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
        <div className="min-w-0 flex-1">
          <label className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-100 block leading-snug">
            {labelBn}
          </label>
          <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5 leading-tight">
            {subBn}
          </span>
        </div>
        <div className="relative w-32 sm:w-36 shrink-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 pointer-events-none">
            {unitLabel}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={val === 0 ? '' : val}
            placeholder={placeholder}
            onChange={(e) => handleNumInput(fieldKey, e.target.value)}
            className="w-full pl-7 pr-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-right text-xs sm:text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#177a56]"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Hero Header & Live Zakat Result Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0d4430] text-white p-5 shadow-lg border border-emerald-500/20 space-y-4">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 border border-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-56 h-56 border border-white/10 rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-emerald-100 text-[11px] font-bold border border-white/10">
              <Calculator className="w-3.5 h-3.5 text-amber-300" />
              <span>শরিয়াহভিত্তিক যাকাত হিসাব</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 leading-snug">
              যাকাত ক্যালকুলেটর
            </h2>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              নির্ধারিত হিসাব পরিমাণ সম্পদের ১ চন্দ্রবর্ষ পূর্ণ হলে ২.৫% (৪০ ভাগের ১ ভাগ) যাকাত ফরজ
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 border border-white/15 transition-colors cursor-pointer shrink-0"
            title="সব তথ্য রিসেট করুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>রিসেট</span>
          </button>
        </div>

        {/* Live Zakat Calculation Result Box */}
        <div className="relative z-10 p-4 rounded-2xl bg-emerald-950/45 backdrop-blur-xs border border-white/15 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="text-xs text-emerald-200 font-semibold block">
                আপনার প্রদেয় মোট যাকাত (২.৫%)
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tabular-nums tracking-tight block mt-0.5">
                {formatBdtBn(calculations.payableZakat)}
              </span>
            </div>

            <div className="text-right">
              {calculations.isZakatEligible ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 text-xs font-extrabold shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  যাকাত ফরজ হয়েছে
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-bold border border-white/15">
                  <Info className="w-3.5 h-3.5 text-amber-300" />
                  {calculations.netZakatableWealth > 0 ? 'যাকাত প্রযোজ্য নয়' : 'সম্পদের তথ্য দিন'}
                </span>
              )}
              {calculations.isZakatEligible && (
                <span className="text-[11px] text-emerald-200 block mt-1 font-medium">
                  মাসিক কিস্তিতে: {formatBdtBn(calculations.monthlyEquivalent)}/মাস
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/10 text-center">
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-emerald-200 block">মোট সম্পদ</span>
              <span className="text-xs font-bold font-mono text-white block mt-0.5 truncate">
                {formatBdtBn(calculations.totalAssets)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-emerald-200 block">বাদযোগ্য ঋণ</span>
              <span className="text-xs font-bold font-mono text-rose-200 block mt-0.5 truncate">
                {formatBdtBn(calculations.totalLiabilities)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/10 border border-amber-300/30">
              <span className="text-[10px] text-amber-200 font-semibold block">নিট যাকাতযোগ্য</span>
              <span className="text-xs font-extrabold font-mono text-amber-300 block mt-0.5 truncate">
                {formatBdtBn(calculations.netZakatableWealth)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hisab / Nisab Basis & Current Gold/Silver Price Configuration */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-none">
                হিসাব মানদণ্ড ও বাজারমূল্য
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 font-medium">
                ৫২.৫ ভরি রুপা (৬১২.৩৬ গ্রাম) অথবা ৭.৫ ভরি স্বর্ণ (৮৭.৪৮ গ্রাম)
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold font-mono text-[#177a56] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-1 rounded-full shrink-0">
            হিসাব: {formatBdtBn(calculations.activeNisabBdt)}
          </span>
        </div>

        {/* Silver vs Gold Hisab Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              updateField('nisabBasis', 'silver');
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              form.nisabBasis === 'silver'
                ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-[#177a56] text-[#177a56] dark:text-emerald-300 font-bold shadow-2xs'
                : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold">রৌপ্য হিসাব (প্রস্তাবিত)</span>
              {form.nisabBasis === 'silver' && <Check className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />}
            </div>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
              ৫২.৫ ভরি রুপা = {formatBdtBn(calculations.silverNisabBdt)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              updateField('nisabBasis', 'gold');
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              form.nisabBasis === 'gold'
                ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-[#177a56] text-[#177a56] dark:text-emerald-300 font-bold shadow-2xs'
                : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold">স্বর্ণ হিসাব</span>
              {form.nisabBasis === 'gold' && <Check className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />}
            </div>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
              ৭.৫ ভরি স্বর্ণ = {formatBdtBn(calculations.goldNisabBdt)}
            </span>
          </button>
        </div>

        {/* Live Auto-Update Market Price Banner & Carat Selector */}
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/35 border border-emerald-500/20 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {form.autoUpdateRate && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    form.autoUpdateRate ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <div className="min-w-0">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#177a56] dark:text-emerald-400 shrink-0" />
                  <span>
                    {form.autoUpdateRate
                      ? 'স্বর্ণ ও রুপার লাইভ বাজারদর (অটো-আপডেট চালু)'
                      : 'কাস্টম বাজারমূল্য (ম্যানুয়াল মোড)'}
                  </span>
                </span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 block">
                  {form.autoUpdateRate
                    ? 'বাজারে স্বর্ণ ও রুপার দাম বাড়লে বা কমলে রেট স্বয়ংক্রিয়ভাবে আপডেট হবে'
                    : 'অটোমেটিক লাইভ রেটে ফিরতে ডানপাশের বাটনে ট্যাপ করুন'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                syncLiveMarketRates(true, form.metalCarat);
              }}
              disabled={isFetchingRates}
              className="px-2.5 py-1.5 rounded-xl bg-[#177a56] hover:bg-[#136446] text-white text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-60"
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingRates ? 'animate-spin' : ''}`} />
              <span>{form.autoUpdateRate ? 'লাইভ আপডেট' : 'অটো রেট চালু করুন'}</span>
            </button>
          </div>

          {/* Carat Purity Selector */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 shrink-0">
              ক্যারেট মান:
            </span>
            <div className="grid grid-cols-4 gap-1.5 flex-1 max-w-xs">
              {CARAT_OPTIONS.map((c) => {
                const isSelected = (form.metalCarat || '22k') === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCaratSelect(c.id)}
                    className={`py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#177a56] text-white shadow-2xs'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {c.labelBn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Per Vori Market Price Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                ১ ভরি রুপার বাজারমূল্য
              </span>
              <span className="text-[10px] text-stone-500">
                {form.autoUpdateRate ? 'অটো লাইভ রেট (চাইলে পরিবর্তনযোগ্য)' : 'ম্যানুয়াল রেট'}
              </span>
            </div>
            <input
              type="number"
              min={100}
              value={form.silverPricePerVori || ''}
              onChange={(e) => handleNumInput('silverPricePerVori', e.target.value)}
              className="w-24 px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-right text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#177a56]"
            />
          </div>

          <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                ১ ভরি স্বর্ণের বাজারমূল্য
              </span>
              <span className="text-[10px] text-stone-500">
                {form.autoUpdateRate ? 'অটো লাইভ রেট (চাইলে পরিবর্তনযোগ্য)' : 'ম্যানুয়াল রেট'}
              </span>
            </div>
            <input
              type="number"
              min={1000}
              value={form.goldPricePerVori || ''}
              onChange={(e) => handleNumInput('goldPricePerVori', e.target.value)}
              className="w-28 px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-right text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#177a56]"
            />
          </div>
        </div>
      </div>

      {/* 3. Section A: Cash & Bank Balances */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-none">
                ১. নগদ অর্থ ও ব্যাংক জমা
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                হাতে থাকা নগদ টাকা, ব্যাংক ও মোবাইল ওয়ালেট ব্যালেন্স
              </p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono text-[#177a56] dark:text-emerald-400">
            {formatBdtBn(calculations.totalCash)}
          </span>
        </div>

        <div className="space-y-2.5">
          {renderAmountField('হাতে থাকা নগদ টাকা', 'বাসায় বা সাথে সংরক্ষিত নগদ অর্থ ও বৈদেশিক মুদ্রা', 'cashInHand')}
          {renderAmountField('ব্যাংক অ্যাকাউন্টে জমা', 'সঞ্চয়ী, চলতি বা যেকোনো ব্যাংক হিসাবে গচ্ছিত টাকা', 'bankBalance')}
          {renderAmountField('মোবাইল ব্যাংকিং (বিকাশ/নগদ/রকেট)', 'ডিজিটাল ওয়ালেটে জমা থাকা অর্থ', 'mobileBanking')}
        </div>
      </div>

      {/* 4. Section B: Gold & Silver Ornaments/Bullion */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-none">
                ২. স্বর্ণ ও রৌপ্য (অলংকার বা বার)
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                ব্যবহৃত বা অব্যবহৃত স্বর্ণ ও রুপার বর্তমান বিক্রয়মূল্য বা ভরি
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => updateField('metalInputMode', 'value')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                form.metalInputMode === 'value'
                  ? 'bg-[#177a56] text-white shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              টাকার মূল্যে
            </button>
            <button
              type="button"
              onClick={() => updateField('metalInputMode', 'weight')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                form.metalInputMode === 'weight'
                  ? 'bg-[#177a56] text-white shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              ভরিতে (ওজন)
            </button>
          </div>
        </div>

        {form.metalInputMode === 'value' ? (
          <div className="space-y-2.5">
            {renderAmountField('স্বর্ণের বর্তমান বিক্রয়মূল্য (টাকায়)', 'সকল স্বর্ণালংকারের আনুমানিক বিক্রয়মূল্য', 'goldValueBdt')}
            {renderAmountField('রুপার বর্তমান বিক্রয়মূল্য (টাকায়)', 'সকল রৌপ্য অলংকার বা মুদ্রার বিক্রয়মূল্য', 'silverValueBdt')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {renderAmountField(
              'স্বর্ণের পরিমাণ (ভরি / তোলা)',
              `আনুমানিক মূল্য: ${formatBdtBn(calculations.computedGoldValue)}`,
              'goldWeightVori',
              '0',
              'ভরি'
            )}
            {renderAmountField(
              'রুপার পরিমাণ (ভরি / তোলা)',
              `আনুমানিক মূল্য: ${formatBdtBn(calculations.computedSilverValue)}`,
              'silverWeightVori',
              '0',
              'ভরি'
            )}
          </div>
        )}
      </div>

      {/* 5. Section C: Investments, Savings & Business Goods */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-none">
                ৩. বিনিয়োগ, সঞ্চয় ও ব্যবসায়িক পণ্য
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                ডিপিএস, এফডিআর, শেয়ার, ব্যবসার মালামাল ও পাওনা ঋণ
              </p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono text-[#177a56] dark:text-emerald-400">
            {formatBdtBn(calculations.totalInvestmentsAndBusiness)}
          </span>
        </div>

        <div className="space-y-2.5">
          {renderAmountField('ডিপিএস (DPS), এফডিআর ও সঞ্চয়পত্র', 'জমাকৃত মূল টাকা ও হালাল মুনাফা', 'fdrDpsSavings')}
          {renderAmountField('শেয়ার বাজার ও অন্যান্য বিনিয়োগ', 'বিক্রয়ের উদ্দেশ্যে রাখা শেয়ার ও ফান্ডের বর্তমান মূল্য', 'sharesInvestments')}
          {renderAmountField('ব্যবসায়িক পণ্যের বর্তমান মূল্য', 'দোকান বা গোডাউনে থাকা বিক্রয়যোগ্য মালের মূল্য', 'businessMerchandise')}
          {renderAmountField('নিশ্চিত পাওনা টাকা (প্রদত্ত ঋণ)', 'অন্যের কাছে পাওনা টাকা যা ফেরত পাওয়ার নিশ্চয়তা আছে', 'receivableLoans')}
          {renderAmountField('বিক্রয়ের উদ্দেশ্যে কেনা জমি বা ফ্ল্যাট', 'শুধুমাত্র ব্যবসার নিয়তে ক্রয়কৃত প্লট বা প্রপার্টির বর্তমান মূল্য', 'otherAssets')}
        </div>
      </div>

      {/* 6. Section D: Deductible Debts & Liabilities */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <MinusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-none">
                ৪. বাদযোগ্য ঋণ ও দায়-দেনা (-)
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                মোট সম্পদ থেকে যে সকল তাৎক্ষণিক পরিশোধযোগ্য ঋণ বিয়োগ হবে
              </p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
            (-) {formatBdtBn(calculations.totalLiabilities)}
          </span>
        </div>

        <div className="space-y-2.5">
          {renderAmountField('ব্যক্তিগত ঋণ ও তাৎক্ষণিক দেনা', 'চলতি বছরে পরিশোধযোগ্য ব্যক্তিগত ঋণ বা মোহরানা', 'personalDebts')}
          {renderAmountField('ব্যবসায়িক বকেয়া ও মহাজনের পাওনা', 'মালের বকেয়া মূল্য, কর্মচারীদের বেতন বা দোকান ভাড়া', 'businessDues')}
          {renderAmountField('অন্যান্য বকেয়া বিল বা কর', 'বকেয়া ইউটিলিটি বিল বা জরুরি পরিশোধযোগ্য দায়', 'otherLiabilities')}
        </div>
      </div>

      {/* 7. Final Summary & Copy Action Card */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>যাকাতের চূড়ান্ত সারসংক্ষেপ</span>
          </h3>
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[#177a56] dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/20 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'কপি হয়েছে' : 'হিসাব কপি করুন'}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
            <span>মোট যাকাতযোগ্য সম্পদ:</span>
            <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
              {formatBdtBn(calculations.totalAssets)}
            </span>
          </div>
          <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
            <span>বাদযোগ্য ঋণ ও দায়-দেনা:</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
              (-) {formatBdtBn(calculations.totalLiabilities)}
            </span>
          </div>
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
            <span>নিট যাকাতযোগ্য সম্পদ:</span>
            <span className="font-mono text-[#177a56] dark:text-emerald-400">
              {formatBdtBn(calculations.netZakatableWealth)}
            </span>
          </div>
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <span className="font-extrabold text-stone-900 dark:text-stone-100">
              প্রদেয় যাকাত (২.৫%):
            </span>
            <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {formatBdtBn(calculations.payableZakat)}
            </span>
          </div>
        </div>
      </div>

      {/* 8. Authentic Zakat Masayel & Quranic Recipients Accordion */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15">
        <button
          type="button"
          onClick={() => setShowMasayel((prev) => !prev)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                যাকাতের জরুরি মাসআলা ও ব্যয়ের খাতসমূহ
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                কোন সম্পদে যাকাত ফরজ এবং কাদের যাকাত দেওয়া যাবে
              </p>
            </div>
          </div>
          {showMasayel ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </button>

        {showMasayel && (
          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-500/20 space-y-1">
              <h4 className="font-bold text-[#177a56] dark:text-emerald-300">
                ১. যাকাতের হিসাব ও বর্ষপূর্তি (হাওল):
              </h4>
              <p>
                নিত্যপ্রয়োজনীয় খরচের অতিরিক্ত সাড়ে ৭ ভরি স্বর্ণ (৮৭.৪৮ গ্রাম) অথবা সাড়ে ৫২ ভরি রুপা (৬১২.৩৬ গ্রাম) বা সমমূল্যের সম্পদ পূর্ণ ১ চন্দ্রবর্ষ (৩৫৪ দিন) স্থায়ী হলে মোট যাকাতযোগ্য সম্পদের ২.৫% (৪০ ভাগের ১ ভাগ) যাকাত আদায় করা ফরজ।
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-500/20 space-y-1">
              <h4 className="font-bold text-amber-800 dark:text-amber-300">
                ২. যেসব সম্পদে যাকাত ফরজ নয়:
              </h4>
              <p>
                নিজের বসবাসের বাড়ি, ব্যবহারের গাড়ি, আসবাবপত্র, পোশাক-পরিচ্ছদ, পেশাগত যন্ত্রপাতি এবং হীরা-মুক্তা বা পাথরের অলংকারের (স্বর্ণ-রুপা ছাড়া) ওপর যাকাত ফরজ নয়।
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1">
              <h4 className="font-bold text-stone-900 dark:text-stone-100">
                ৩. যাকাত প্রদানের খাত (সূরা আত-তাওবাহ: ৬০):
              </h4>
              <p>
                দরিদ্র ফকির, মিসকিন, ঋণগ্রস্ত ব্যক্তি, নিঃস্ব মুসাফির ও অসহায় আত্মীয়-স্বজনকে (ভাই-বোন, চাচা-ফুফু, মামা-খালা) যাকাত দেওয়া অধিক সওয়াবের কাজ। তবে পিতা-মাতা, দাদা-দাদি, নিজের সন্তান-সন্ততি এবং স্বামী-স্ত্রী একে অপরকে যাকাত দিতে পারবেন না।
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
