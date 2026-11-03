import React, { useState } from 'react';
import { X, Sparkles, Sun, Moon, Home, Compass, MapPin, Coffee, Heart, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface DeenNavigatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: 'prayers' | 'quran' | 'duas') => void;
}

interface SituationGuide {
  id: string;
  nameBn: string;
  icon: React.ComponentType<{ className?: string }>;
  bestActionsBn: string[];
  recommendedDuaBn: {
    title: string;
    arabic: string;
    transliteration: string;
    translation: string;
    reference: string;
  };
}

const SITUATIONS: SituationGuide[] = [
  {
    id: 'mosque_going',
    nameBn: 'মসজিদে যাওয়ার সময়',
    icon: Compass,
    bestActionsBn: [
      'সুন্দরভাবে বাড়ি থেকে অজু করে বের হন (প্রতি পদক্ষেপে একটি করে নেকি ও মর্যাদা বৃদ্ধি)',
      'ধীরস্থিরভাবে ও গাম্ভীর্যের সাথে হাঁটুন, তাড়াহুড়ো করবেন না',
      'মসজিদে ডান পা দিয়ে প্রবেশ করুন এবং মসজিদে প্রবেশের দোয়া পড়ুন',
      'বসার পূর্বে ২ রাকাত তাহিয়্যাতুল মসজিদ সালাত আদায় করার চেষ্টা করুন'
    ],
    recommendedDuaBn: {
      title: 'মসজিদে প্রবেশের দোয়া',
      arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
      transliteration: 'আল্লাহুম্মাফ তাহলী আবওয়াবা রাহমাতিক।',
      translation: 'হে আল্লাহ! আমার জন্য আপনার রহমতের দরজাসমূহ উন্মুক্ত করে দিন।',
      reference: 'সহিহ মুসলিম ৭১৩'
    }
  },
  {
    id: 'sleep_time',
    nameBn: 'ঘুমানোর সময়',
    icon: Moon,
    bestActionsBn: [
      'অজু অবস্থায় ঘুমানোর চেষ্টা করুন',
      'বিছানা ঝেড়ে নিন এবং ডান কাত হয়ে শয়ন করুন',
      'সূরা আল-ইখলাস, ফালাক ও নাস পড়ে দুই হাতের তালুতে ফুঁ দিয়ে পুরো শরীরে হাত বুলিয়ে নিন (৩ বার)',
      'আয়াতুল কুরসি ও সূরা বাকারার শেষ দুই আয়াত তিলাওয়াত করুন'
    ],
    recommendedDuaBn: {
      title: 'ঘুমানোর দোয়া',
      arabic: 'اللَّهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا',
      transliteration: 'আল্লাহুম্মা বিসমিকা আমূতু ওয়া আহ্ইয়া।',
      translation: 'হে আল্লাহ! আপনারই নামে আমি মৃত্যুবরণ করছি এবং জীবিত হব।',
      reference: 'সহিহ বুখারি ৬৩১২'
    }
  },
  {
    id: 'home_enter',
    nameBn: 'ঘরে প্রবেশ ও বাহির',
    icon: Home,
    bestActionsBn: [
      'ঘর থেকে বের হওয়ার সময় আল্লাহর ওপর তাওয়াক্কুল করে দোয়া পাঠ করুন',
      'ঘরে প্রবেশের সময় বিসমিল্লাহ বলুন ও পরিবারের সকলকে সালাম দিন',
      'ঘরে প্রবেশ করে মেসওয়াক করা রাসূলুল্লাহ (সা.)-এর অন্যতম প্রিয় সুন্নাত ছিল'
    ],
    recommendedDuaBn: {
      title: 'ঘর থেকে বের হওয়ার দোয়া',
      arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
      transliteration: 'বিসমিল্লাহি তাওয়াক্কালতু আলাল্লাহ, লা হাওলা ওয়ালা কুওয়াতা ইল্লা বিল্লাহ।',
      translation: 'আল্লাহর নামে বের হলাম, আল্লাহর ওপর ভরসা করলাম। আল্লাহর সাহায্য ছাড়া কোনো শক্তি নেই।',
      reference: 'সুনান আবু দাউদ ৫০৯৫'
    }
  },
  {
    id: 'travel',
    nameBn: 'সফর বা ভ্রমণে',
    icon: MapPin,
    bestActionsBn: [
      'যানবাহনে আরোহণের সুন্নাহ দোয়া পাঠ করুন',
      'সফরে ৪ রাকাত বিশিষ্ট ফরজ নামাজ (যোহর, আসর, এশা) ২ রাকাত করে কসর পড়ুন',
      'সফরের দোয়া কবুল হয়, তাই বেশি বেশি দোয়া করুন'
    ],
    recommendedDuaBn: {
      title: 'যানবাহনে আরোহণের দোয়া',
      arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
      transliteration: 'সুবহানাল্লাযী সাখ্খারা লানা হাযা ওয়ামা কুন্না লাহু মুকরিনীনা, ওয়া ইন্না ইলা রাব্বিনা লামুনকালিবূন।',
      translation: 'পবিত্র সেই সত্তা যিনি এটিকে আমাদের বশীভূত করেছেন...',
      reference: 'সূরা আয-যুখরুফ: ১৩-১৪'
    }
  },
  {
    id: 'distress',
    nameBn: 'বিপদে বা মানসিক চাপে',
    icon: Heart,
    bestActionsBn: [
      'ধৈর্য ধারণ করুন এবং দুই রাকাত নফল সালাতুল হাজত আদায় করুন',
      'বেশি বেশি "লা হাওলা ওয়ালা কুওয়াতা ইল্লা বিল্লাহ" পাঠ করুন',
      'দোয়া ইউনুস একনিষ্ঠভাবে পাঠ করুন'
    ],
    recommendedDuaBn: {
      title: 'দোয়া ইউনুস (বিপদের শ্রেষ্ঠ দোয়া)',
      arabic: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
      transliteration: 'লা ইলাহা ইল্লা আনতা সুবহানাকা ইন্নী কুনতু মিনায যলিমীন।',
      translation: 'আপনি ছাড়া কোনো সত্য উপাস্য নেই, আপনি পরম পবিত্র। নিশ্চয়ই আমি অপরাধীদের অন্তর্ভুক্ত।',
      reference: 'সূরা আম্বিয়া: ৮৭, তিরমিজি ৩৫০৫'
    }
  },
  {
    id: 'friday',
    nameBn: 'জুমার দিনে (শুক্রবার)',
    icon: Sparkles,
    bestActionsBn: [
      'গোসল করা, উত্তম পোশাক পরিধান করা এবং সুগন্ধি ব্যবহার করা',
      'সূরা আল-কাহাফ তিলাওয়াত করা',
      'রাসূলুল্লাহ (সা.)-এর ওপর বেশি বেশি দরুদ পাঠ করা',
      'আসরের পর থেকে মাগরিব পর্যন্ত দোয়ায় মশগুল থাকা (বিশেষ দোয়া কবুলের মুহূর্ত)'
    ],
    recommendedDuaBn: {
      title: 'দুরুদে ইব্রাহিম',
      arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
      transliteration: 'আল্লাহুম্মা সাল্লি আলা মুহাম্মাদিউঁ ওয়া আলা আলি মুহাম্মাদ...',
      translation: 'হে আল্লাহ! মুহাম্মদ (সা.) ও তাঁর পরিবারের ওপর রহমত বর্ষণ করুন...',
      reference: 'সহিহ বুখারি ৩৩৭০'
    }
  }
];

export const DeenNavigatorModal: React.FC<DeenNavigatorModalProps> = ({ isOpen, onClose }) => {
  const [selectedSituation, setSelectedSituation] = useState<SituationGuide>(SITUATIONS[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                এখন আমার কী করা উচিত?
              </h3>
              <p className="text-[11px] text-stone-500">
                দ্বীনি জীবন নেভিগেটর — বর্তমান পরিস্থিতির সুন্নাহ নির্দেশনা
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Situation Pills */}
        <div className="p-3 border-b border-stone-100 dark:border-stone-800 flex gap-2 overflow-x-auto scrollbar-none bg-stone-50 dark:bg-stone-800/40">
          {SITUATIONS.map((sit) => {
            const isSelected = selectedSituation.id === sit.id;
            const Icon = sit.icon;
            return (
              <button
                key={sit.id}
                onClick={() => {
                  triggerHaptic(20);
                  setSelectedSituation(sit);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sit.nameBn}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Recommended Sunnah Actions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              সুন্নাহসম্মত সেরা আমলসমূহ:
            </h4>
            <div className="space-y-2">
              {selectedSituation.bestActionsBn.map((act, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="leading-relaxed">{act}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Dua Card */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">
              প্রাসঙ্গিক দোয়া: {selectedSituation.recommendedDuaBn.title}
            </span>
            <p className="font-arabic text-right text-lg text-stone-900 dark:text-stone-100 leading-loose">
              {selectedSituation.recommendedDuaBn.arabic}
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-400 italic">
              {selectedSituation.recommendedDuaBn.transliteration}
            </p>
            <p className="text-xs text-stone-700 dark:text-stone-300">
              “{selectedSituation.recommendedDuaBn.translation}”
            </p>
            <span className="text-[11px] text-stone-500 block pt-1 border-t border-stone-200 dark:border-stone-700">
              উৎস: {selectedSituation.recommendedDuaBn.reference}
            </span>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 border-t border-stone-100 dark:border-stone-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            বুঝেছি, জাযাকাল্লাহু খাইরান
          </button>
        </div>
      </div>
    </div>
  );
};
