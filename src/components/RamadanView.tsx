import React, { useState } from 'react';
import { Moon, Clock, Calendar, CheckCircle, Plus, Minus, AlertCircle, Info } from 'lucide-react';
import { District, PrayerTimes, UserSettings } from '../types';
import { toBengaliDigits, computePrayerTimes } from '../utils/prayerTimes';
import { storage } from '../utils/storage';
import { triggerHaptic } from '../utils/audio';

interface RamadanViewProps {
  district: District;
  prayers: PrayerTimes;
  settings: UserSettings;
}

export const RamadanView: React.FC<RamadanViewProps> = ({ district, prayers, settings }) => {
  const [rozaState, setRozaState] = useState(() => storage.getRozaTracker());
  const [activeTab, setActiveTab] = useState<'today' | 'schedule' | 'tracker' | 'qadr'>('today');

  // Fasting days toggle
  const handleToggleDay = (dayNum: number) => {
    triggerHaptic(25);
    setRozaState((prev) => {
      const isAlready = prev.completedDays.includes(dayNum);
      const nextDays = isAlready
        ? prev.completedDays.filter((d) => d !== dayNum)
        : [...prev.completedDays, dayNum];
      const newState = { ...prev, completedDays: nextDays };
      storage.saveRozaTracker(newState);
      return newState;
    });
  };

  // Qaza count adjust
  const handleAdjustQaza = (delta: number) => {
    triggerHaptic(20);
    setRozaState((prev) => {
      const nextQaza = Math.max(0, prev.qazaCount + delta);
      const newState = { ...prev, qazaCount: nextQaza };
      storage.saveRozaTracker(newState);
      return newState;
    });
  };

  // Generate 30 days Ramadan timetable for the district
  const baseRamadanStart = new Date();
  const scheduleRows = Array.from({ length: 30 }, (_, idx) => {
    const dayDate = new Date(baseRamadanStart);
    dayDate.setDate(baseRamadanStart.getDate() + idx);
    const dayPrayers = computePrayerTimes(
      dayDate,
      district.lat,
      district.lng,
      settings.juristicMethod,
      settings.calcMethod
    );
    return {
      day: idx + 1,
      dateStr: `${toBengaliDigits(dayDate.getDate())}/${toBengaliDigits(dayDate.getMonth() + 1)}`,
      sehriEnd: dayPrayers.fajr,
      iftar: dayPrayers.maghrib
    };
  });

  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Moon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            রমজানুল মুবারক ও সিয়াম
          </h2>
          <span className="text-xs text-stone-500">
            {district.nameBn} জেলা অনুযায়ী সময়সূচি
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'today' ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          আজকের সময়
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'schedule' ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          ৩০ দিনের সূচি
        </button>
        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'tracker' ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          রোজা ট্র্যাকার
        </button>
        <button
          onClick={() => setActiveTab('qadr')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'qadr' ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          কদর ও বিধান
        </button>
      </div>

      {/* TAB 1: TODAY'S SEHRI & IFTAR */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Sehri Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-stone-900 text-white p-4 rounded-2xl border border-indigo-800 shadow-sm text-center">
              <span className="text-xs text-indigo-300 font-medium block">
                সেহরির শেষ সময়
              </span>
              <span className="text-2xl font-bold font-mono text-white tabular-nums my-1 block">
                {prayers.fajr}
              </span>
              <span className="text-[11px] text-stone-300">
                সতর্কতামূলক ২ মিনিট পূর্বে
              </span>
            </div>

            {/* Iftar Card */}
            <div className="bg-gradient-to-br from-emerald-900 to-stone-900 text-white p-4 rounded-2xl border border-emerald-800 shadow-sm text-center">
              <span className="text-xs text-emerald-300 font-medium block">
                ইফতারের সময়
              </span>
              <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums my-1 block">
                {prayers.maghrib}
              </span>
              <span className="text-[11px] text-stone-300">
                সূর্যাস্তের সাথে সাথে
              </span>
            </div>
          </div>

          {/* Iftar & Sehri Authentic Duas */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800 space-y-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              ইফতারের সহিহ সুন্নাহ দোয়া
            </h3>
            <p className="font-arabic text-right text-xl leading-relaxed text-stone-900 dark:text-stone-100">
              ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-400 italic">
              যাহাবাজ জামা-উ, ওয়াবতাল্লাতিল উরূকু, ওয়া সাবাতাল আজরু ইনশাআল্লাহ।
            </p>
            <p className="text-xs text-stone-700 dark:text-stone-300">
              “পিপাসা দূর হলো, শিরা-উপশিরা সিক্ত হলো এবং আল্লাহ চাহেন তো প্রতিদানও নির্ধারিত হলো।”
            </p>
            <span className="text-[11px] text-stone-500 block pt-1 border-t border-stone-100 dark:border-stone-800">
              রেফারেন্স: সুনান আবু দাউদ ২৩৫৮, সহিহুল জামে ৪৬৮৭ (সহিহ)
            </span>
          </div>

          {/* Fasting Niyyah Note */}
          <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs space-y-1.5 text-stone-700 dark:text-stone-300 leading-relaxed">
            <strong className="text-stone-900 dark:text-stone-100 font-semibold block">
              রোজার নিয়ত সম্পর্কে ফিকহি বিধান:
            </strong>
            <p>
              নিয়ত মূলত মনের ইচ্ছা ও সংকল্প। মুখে নির্দিষ্ট আরবি বাক্য উচ্চারণ করা বাধ্যতামূলক নয়; সেহরি খাওয়ার মাধ্যমে বা অন্তরে পরদিন রোজা রাখার সংকল্প করলেই নিয়ত পূর্ণ হয়ে যায়। (সহিহ বুখারি ১)
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: 30 DAYS SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="p-3 bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 grid grid-cols-4 text-center">
            <span>রমজান দিন</span>
            <span>তারিখ</span>
            <span>সেহরি শেষ</span>
            <span>ইফতার</span>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-96 overflow-y-auto">
            {scheduleRows.map((r) => (
              <div key={r.day} className="p-3 text-xs grid grid-cols-4 text-center hover:bg-stone-50 dark:hover:bg-stone-800/40">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  {toBengaliDigits(r.day)}ম রমজান
                </span>
                <span className="text-stone-600 dark:text-stone-400">{r.dateStr}</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">{r.sehriEnd}</span>
                <span className="font-mono font-medium text-amber-700 dark:text-amber-400">{r.iftar}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ROZA TRACKER */}
      {activeTab === 'tracker' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">
              রমজানের রোজা ট্র্যাকিং
            </h3>
            <p className="text-xs text-stone-500 mb-3">
              যে যে দিন রোজা রেখেছেন ট্যাপ করে টিক চিহ্ন দিন ({toBengaliDigits(rozaState.completedDays.length)}/৩০ দিন সম্পন্ন)
            </p>

            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((dayNum) => {
                const isDone = rozaState.completedDays.includes(dayNum);
                return (
                  <button
                    key={dayNum}
                    onClick={() => handleToggleDay(dayNum)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {toBengaliDigits(dayNum)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Qaza Counter */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                কাজা রোজা ট্র্যাকার
              </h4>
              <span className="text-xs text-stone-500">
                অসুস্থতা বা সফরে ছুটে যাওয়া রোজা
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAdjustQaza(-1)}
                className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300 tabular-nums">
                {toBengaliDigits(rozaState.qazaCount)}টি
              </span>
              <button
                onClick={() => handleAdjustQaza(1)}
                className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LAYLATUL QADR & GUIDELINES */}
      {activeTab === 'qadr' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
              লাইলাতুল কদর অনুসন্ধান ও সুন্নাহ দোয়া
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              রমজানের শেষ দশকের বিজোড় রাতগুলোতে (২১, ২৩, ২৫, ২৭ ও ২৯তম রাতে) কদর তালাশ করার নির্দেশ রয়েছে। (সহিহ বুখারি ২০২৭)
            </p>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-1.5">
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
              কদরের রাতের বিশেষ দোয়া:
            </span>
            <p className="font-arabic text-right text-lg text-stone-900 dark:text-stone-100">
              اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-400 italic">
              আল্লাহুম্মা ইন্নাকা আফুউন, তুহিব্বুল আফওয়া, ফা’ফু আন্নী।
            </p>
            <p className="text-xs text-stone-700 dark:text-stone-300">
              “হে আল্লাহ! আপনি ক্ষমাশীল, ক্ষমা করা পছন্দ করেন; অতএব আমাকে ক্ষমা করুন।”
            </p>
            <span className="text-[11px] text-stone-500 block">
              রেফারেন্স: জামে আত-তিরমিজি ৩৫১৩ (সহিহ)
            </span>
          </div>

          <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              রমজান এবং ঈদের চূড়ান্ত তারিখ জাতীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী নির্ধারিত হবে।
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
