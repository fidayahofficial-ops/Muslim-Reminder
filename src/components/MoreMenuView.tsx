import React, { useState } from 'react';
import { 
  Compass, 
  Moon, 
  HelpCircle, 
  BookOpen, 
  Sun, 
  CircleDot, 
  Heart, 
  Plane, 
  CheckCircle2, 
  FileText, 
  Bookmark, 
  Settings,
  ChevronRight,
  User,
  Trophy,
  Info,
  Sparkles,
  Flame,
  Search,
  Calculator,
  Download,
  Smartphone,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { MoreSection } from '../types';

interface MoreMenuViewProps {
  onSelectSection: (section: MoreSection) => void;
  streakDays?: number;
  totalPoints?: number;
  userName?: string;
}

export const MoreMenuView: React.FC<MoreMenuViewProps> = React.memo(({ 
  onSelectSection,
  streakDays = 1,
  totalPoints = 120,
  userName = 'মুসাফির'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ibadah' | 'knowledge' | 'tools' | 'personal'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems: Array<{
    id: MoreSection;
    titleBn: string;
    descBn: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    category: 'ibadah' | 'knowledge' | 'tools' | 'personal';
  }> = [
    { id: 'profile', titleBn: 'আমার প্রোফাইল', descBn: 'আমল অগ্রগতি, ক্লাউড ব্যাকআপ ও স্তর', icon: User, accentColor: 'text-[#177a56] bg-emerald-100/70 dark:bg-emerald-950/80 dark:text-emerald-300', category: 'personal' },
    { id: 'ranking', titleBn: 'দ্বীনি র‍্যাংকিং ও ব্যাজ', descBn: 'ধারাবাহিক আমলভিত্তিক স্তর ও পয়েন্ট', icon: Trophy, accentColor: 'text-amber-700 bg-amber-100/70 dark:bg-amber-950/80 dark:text-amber-300', category: 'personal' },
    { id: 'tracker', titleBn: 'আমল ট্র্যাকার', descBn: '৫ ওয়াক্ত সালাত ও আত্মপর্যালোচনা লগ', icon: CheckCircle2, accentColor: 'text-[#177a56] bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400', category: 'ibadah' },
    { id: 'hajj_countdown', titleBn: 'হজ কাউন্টডাউন ও সময়সূচি', descBn: 'হিজরি ক্যালেন্ডার অনুযায়ী আসন্ন হজের দিনক্ষণ ও প্রস্তুতি', icon: Clock, accentColor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300', category: 'ibadah' },
    { id: 'zakat', titleBn: 'যাকাত ক্যালকুলেটর', descBn: 'স্বর্ণ-রুপা, নগদ অর্থ ও সম্পদের ২.৫% যাকাত হিসাব', icon: Calculator, accentColor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300', category: 'ibadah' },
    { id: 'qibla', titleBn: 'কিবলা কম্পাস', descBn: 'কাবা শরিফের সঠিক দিক ও ডিগ্রি সেন্সর', icon: Compass, accentColor: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-400', category: 'tools' },
    { id: 'tasbih', titleBn: 'ডিজিটাল তাসবিহ', descBn: 'স্মার্ট বিড কাউন্টার, লক্ষ্য ও পরিসংখ্যান', icon: CircleDot, accentColor: 'text-[#177a56] bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400', category: 'tools' },
    { id: 'ramadan', titleBn: 'রমজান ও রোজা', descBn: 'সেহরি-ইফতারের সময় ও ৩০ দিনের ক্যালেন্ডার', icon: Moon, accentColor: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400', category: 'ibadah' },
    { id: 'azkar', titleBn: 'সকাল ও সন্ধ্যার আজকার', descBn: 'হিসনুল মুসলিমের বিশুদ্ধ মাসনুন আমল', icon: Sun, accentColor: 'text-orange-600 bg-orange-50 dark:bg-orange-950/60 dark:text-orange-400', category: 'ibadah' },
    { id: 'prayer_guide', titleBn: 'নামাজ ও অজু শিক্ষা', descBn: 'ধাপে ধাপে সচিত্র ৫ ওয়াক্তের নামাজ', icon: Heart, accentColor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400', category: 'ibadah' },
    { id: 'hadith', titleBn: 'সহিহ হাদিস সংকলন', descBn: 'বুখারি ও মুসলিমের সহিহ হাদিস ভাণ্ডার', icon: BookOpen, accentColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400', category: 'knowledge' },
    { id: 'sunnah', titleBn: 'দৈনন্দিন সুন্নাহ', descBn: 'সালাত, ওজু ও দৈনন্দিন সুন্নাত ও আমল', icon: Sparkles, accentColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400', category: 'knowledge' },
    { id: 'quiz', titleBn: 'দৈনিক কুইজ ও চ্যালেঞ্জ', descBn: 'যাচাইকৃত ইসলামিক জ্ঞান, স্ট্রিক ও স্কোর', icon: HelpCircle, accentColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400', category: 'knowledge' },
    { id: 'hajj_guide', titleBn: 'হজ ও উমরাহ গাইড', descBn: 'তালবিয়া, তাওয়াফ ও সাঈর পূর্ণ আহকাম', icon: Plane, accentColor: 'text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400', category: 'knowledge' },
    { id: 'notes', titleBn: 'ব্যক্তিগত নোট', descBn: 'কুরআনি চিন্তা, খুতবা ও আধ্যাত্মিক ভাবনা', icon: FileText, accentColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400', category: 'personal' },
    { id: 'bookmarks', titleBn: 'আমার বুকমার্ক', descBn: 'সংরক্ষিত আয়াত, প্রিয় দোয়া ও হাদিস', icon: Bookmark, accentColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400', category: 'personal' },
    { id: 'settings', titleBn: 'অ্যাপ সেটিংস', descBn: 'আজান সাউন্ড, ফন্ট, মাজহাব ও থিম', icon: Settings, accentColor: 'text-stone-600 bg-stone-100 dark:bg-stone-800 dark:text-stone-300', category: 'tools' },
    { id: 'about', titleBn: 'অ্যাপ পরিচিতি', descBn: 'Muslim Reminder পরিচিতি, তথ্যসূত্র ও যোগাযোগ', icon: Info, accentColor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300', category: 'tools' }
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.titleBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descBn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Profile / Ranking Quick Banner (Qalbee style) */}
      <div 
        onClick={() => onSelectSection('profile')}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0d4430] text-white p-4 shadow-md border border-emerald-500/20 cursor-pointer flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-black text-lg border border-white/20 shadow-xs">
            {userName ? userName.charAt(0) : 'ও'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-white leading-snug">
                {userName}
              </h2>
              <span className="text-[10px] font-bold bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full">
                দ্বীনি যাত্রী
              </span>
            </div>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              প্রোফাইল, স্তর ও ক্লাউড সিঙ্ক পরিচালনা করুন
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1 transition-transform" />
      </div>

      {/* 2. Search & Category Filter Pills */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ফিচার বা টুল অনুসন্ধান করুন..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#177a56]"
          />
        </div>

        {/* Categories Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: 'সকল ফিচার' },
            { id: 'ibadah', label: 'ইবাদাত ও সালাত' },
            { id: 'knowledge', label: 'কুরআন ও হাদিস' },
            { id: 'tools', label: 'টুলস ও সাহায্য' },
            { id: 'personal', label: 'ব্যক্তিগত' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#177a56] text-white shadow-xs'
                  : 'bg-white dark:bg-[#131b17] text-stone-600 dark:text-stone-400 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-emerald-50/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Grid of Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/50 transition-all flex items-center justify-between text-left cursor-pointer group active:scale-99"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.accentColor} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                    {item.titleBn}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 line-clamp-1 mt-0.5 font-normal">
                    {item.descBn}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#177a56] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          );
        })}
      </div>
      {/* 4. Direct Android APK Download Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-500/25 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#177a56] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              অ্যান্ড্রয়েড অ্যাপ (Muslim Reminder.apk)
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-0.5 font-normal">
              ফোনে সরাসরি APK ডাউনলোড ও ইনস্টল করে অফলাইনে ব্যবহার করুন
            </p>
          </div>
        </div>
        <a
          href="/waqto-app.apk"
          download="Muslim-Reminder.apk"
          className="px-3.5 py-2 rounded-xl bg-[#177a56] hover:bg-[#126446] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>APK ডাউনলোড</span>
        </a>
      </div>

      {/* 5. Secure Admin Panel Access (Strictly Primary Admin Only) */}
      <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 border border-emerald-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white">
              প্রধান অ্যাডমিন প্যানেল (Admin Panel)
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              শুধুমাত্র প্রধান অ্যাডমিন (nafiulislam3810@gmail.com) এর জন্য সংরক্ষিত
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('waqto-open-admin'))}
          className="px-3.5 py-2 rounded-xl bg-[#177a56] hover:bg-[#126446] text-white text-xs font-bold shrink-0 cursor-pointer transition-colors"
        >
          অ্যাডমিন প্যানেল →
        </button>
      </div>
    </div>
  );
});

