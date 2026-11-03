import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Volume2, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Sun, 
  Moon, 
  Sparkles,
  Square,
  Play
} from 'lucide-react';
import { PrayerTimes, NextPrayerInfo, District, UserSettings } from '../types';
import { computePrayerTimes, toBengaliDigits } from '../utils/prayerTimes';
import { soundManager, triggerHaptic, PRAYER_ALERT_SOUND_OPTIONS } from '../utils/audio';

interface PrayerTimesViewProps {
  district: District;
  prayers: PrayerTimes;
  nextPrayer: NextPrayerInfo;
  currentPrayer: { nameBn: string; nameKey: string; timeStr: string };
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenDistrictModal: () => void;
}

export const PrayerTimesView: React.FC<PrayerTimesViewProps> = React.memo(({
  district,
  prayers,
  nextPrayer,
  currentPrayer,
  settings,
  onUpdateSettings,
  onOpenDistrictModal
}) => {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    const unsub = soundManager.subscribe((id) => {
      setIsPlayingTest(!!id);
    });
    return () => unsub();
  }, []);

  // Compute times for the selected day offset
  const viewingDate = new Date();
  viewingDate.setDate(viewingDate.getDate() + selectedDayOffset);

  const displayPrayers = selectedDayOffset === 0 
    ? prayers 
    : computePrayerTimes(
        viewingDate,
        district.lat,
        district.lng,
        settings.juristicMethod,
        settings.calcMethod,
        {
          fajr: settings.fajrOffset,
          dhuhr: settings.dhuhrOffset,
          asr: settings.asrOffset,
          maghrib: settings.maghribOffset,
          isha: settings.ishaOffset
        },
        settings.hijriDayAdjustment
      );

  const prayerRows = [
    { key: 'fajr', nameBn: 'ফজর', time: displayPrayers.fajr, icon: Moon, note: 'সুবহে সাদিক (সাহরির শেষ সময়)' },
    { key: 'sunrise', nameBn: 'সূর্যোদয়', time: displayPrayers.sunrise, icon: Sun, note: 'নামাজ নিষিদ্ধ সময় শুরু (প্রায় ১৫ মি.)' },
    { key: 'ishraq', nameBn: 'ইশরাক', time: displayPrayers.ishraq, icon: Sun, note: 'নফল সালাত (সূর্যোদয়ের ১৮-২০ মিনিট পর)' },
    { key: 'chasht', nameBn: 'চাশত / দুহা', time: displayPrayers.chasht, icon: Sun, note: 'নফল সালাত (মধ্য সকালের উত্তম সময়)' },
    { key: 'dhuhr', nameBn: 'যোহর', time: displayPrayers.dhuhr, icon: Sun, note: 'মধ্যাহ্ন সালাত (দ্বিপ্রহরের পর)' },
    { key: 'asr', nameBn: 'আসর', time: displayPrayers.asr, icon: Sun, note: settings.juristicMethod === 'hanafi' ? 'হানাফি পদ্ধতি (২ ছায়া)' : 'শাফেঈ পদ্ধতি (১ ছায়া)' },
    { key: 'maghrib', nameBn: 'মাগরিব', time: displayPrayers.maghrib, icon: Moon, note: 'সূর্যাস্তের পর (ইফতারের সময়)' },
    { key: 'isha', nameBn: 'এশা', time: displayPrayers.isha, icon: Moon, note: 'রাত্রিকালীন ফরজ ও বিতর সালাত' }
  ];

  const handleTestAzan = () => {
    if (isPlayingTest) {
      soundManager.stopAudio();
      setIsPlayingTest(false);
    } else {
      triggerHaptic(50);
      const chosenSound = settings.prayerAlertSound || 'azan_makkah';
      soundManager.playPrayerAlert(chosenSound, () => {
        setIsPlayingTest(false);
      });
      setIsPlayingTest(true);
    }
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Header with District Selector & Day Pagination */}
      <div className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-none">
                {district.nameBn} জেলা
              </h2>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                {settings.useGps ? 'জিপিএস সমন্বিত নির্ভুল সময়' : 'ইসলামিক ফাউন্ডেশন মানদণ্ড'}
              </span>
            </div>
          </div>
          <button
            onClick={onOpenDistrictModal}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-[#177a56] dark:text-emerald-300 transition-colors cursor-pointer border border-emerald-500/20"
          >
            জেলা পরিবর্তন
          </button>
        </div>

        {/* Date switcher (Prev Day / Today / Next Day) */}
        <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800/80 pt-3">
          <button
            onClick={() => setSelectedDayOffset(prev => prev - 1)}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
            title="পূর্ববর্তী দিন"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center space-y-0.5">
            <span className="block text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              {displayPrayers.dateStr}
            </span>
            <span className="block text-xs font-semibold text-[#177a56] dark:text-emerald-400">
              {displayPrayers.hijriDateStr}
            </span>
          </div>

          <button
            onClick={() => setSelectedDayOffset(prev => prev + 1)}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
            title="পরবর্তী দিন"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {selectedDayOffset !== 0 && (
          <div className="text-center pt-1 border-t border-stone-100 dark:border-stone-800/60">
            <button
              onClick={() => setSelectedDayOffset(0)}
              className="text-xs font-bold text-[#177a56] dark:text-emerald-400 hover:underline cursor-pointer"
            >
              আজকের ওয়াক্তে ফিরে যান
            </button>
          </div>
        )}
      </div>

      {/* 2. Today's Countdown Banner (when viewing today) */}
      {selectedDayOffset === 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0d4430] text-white p-5 shadow-lg border border-emerald-500/20 flex items-center justify-between">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0 border border-white/10">
              <Clock className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <p className="text-xs text-emerald-200 font-medium">পরবর্তী সালাত</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                {nextPrayer.nameBn} — <span className="text-amber-300 font-mono font-black">{nextPrayer.timeStr}</span>
              </h3>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                চলমান ওয়াক্ত: <strong className="text-white font-bold">{currentPrayer.nameBn}</strong>
              </p>
            </div>
          </div>
          <div className="relative z-10 text-right">
            <span className="text-xs sm:text-sm font-mono text-amber-300 tabular-nums font-bold block bg-emerald-950/60 px-2.5 py-1 rounded-full border border-amber-300/30">
              {nextPrayer.remainingMinutes > 60 
                ? `${toBengaliDigits(Math.floor(nextPrayer.remainingMinutes / 60))} ঘণ্টা ${toBengaliDigits(nextPrayer.remainingMinutes % 60)} মি. বাকি`
                : `${toBengaliDigits(nextPrayer.remainingMinutes)} মি. বাকি`}
            </span>
          </div>
        </div>
      )}

      {/* 3. Prayer Times List */}
      <div className="bg-white dark:bg-[#131b17] rounded-2xl shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 divide-y divide-stone-100 dark:divide-stone-800/80 overflow-hidden">
        {prayerRows.map((row) => {
          const isCurrent = selectedDayOffset === 0 && currentPrayer.nameKey === row.key;
          const isNext = selectedDayOffset === 0 && nextPrayer.nameKey === row.key;
          const Icon = row.icon;

          return (
            <div
              key={row.key}
              className={`p-3.5 flex items-center justify-between transition-colors ${
                isCurrent
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/50'
                  : isNext
                  ? 'bg-amber-50/80 dark:bg-amber-950/40'
                  : 'hover:bg-stone-50/50 dark:hover:bg-stone-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isCurrent 
                    ? 'bg-[#177a56] text-white shadow-xs' 
                    : isNext
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2 leading-none">
                    {row.nameBn}
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-white bg-[#177a56] px-2 py-0.5 rounded-full">
                        চলতি ওয়াক্ত
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                        পরবর্তী ওয়াক্ত
                      </span>
                    )}
                  </h4>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium leading-relaxed block mt-0.5">
                    {row.note}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                  isCurrent ? 'text-[#177a56] dark:text-emerald-400 font-extrabold' : isNext ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-stone-900 dark:text-stone-100'
                }`}>
                  {row.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Azan Audio Preview Box */}
      <div className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
            <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
              আজান ও অডিও প্রিভিউ
            </h4>
          </div>
          <button
            onClick={handleTestAzan}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isPlayingTest 
                ? 'bg-rose-600 text-white' 
                : 'bg-[#177a56] hover:bg-[#126446] text-white shadow-xs'
            }`}
          >
            {isPlayingTest ? (
              <>
                <Square className="w-3 h-3 fill-white" />
                <span>আজান থামান</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-white" />
                <span>আজান শুনুন</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400">
          নির্বাচিত মোয়াজ্জিন: <strong>{PRAYER_ALERT_SOUND_OPTIONS.find(o => o.id === (settings.prayerAlertSound || 'azan_makkah'))?.nameBn || 'মক্কা মুকাররমার আজান'}</strong>
        </p>
      </div>

      {/* 5. Juristic Method & Calculation Controls */}
      <div className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          গণনা পদ্ধতি ও মাজহাব
        </h4>

        {/* Asr juristic toggle */}
        <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
          <div>
            <span className="font-bold text-stone-900 dark:text-stone-100 block leading-snug">আসরের পদ্ধতি (মাজহাব)</span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
              {settings.juristicMethod === 'hanafi' ? 'হানাফি (ছায়ার দৈর্ঘ্য ২ গুণ)' : 'শাফেঈ/মালিকি/হাম্বলী (ছায়ার দৈর্ঘ্য ১ গুণ)'}
            </span>
          </div>

          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            <button
              onClick={() => onUpdateSettings({ juristicMethod: 'hanafi' })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.juristicMethod === 'hanafi'
                  ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              হানাফি
            </button>
            <button
              onClick={() => onUpdateSettings({ juristicMethod: 'shafii' })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.juristicMethod === 'shafii'
                  ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              শাফেঈ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
