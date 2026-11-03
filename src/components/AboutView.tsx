import React from 'react';
import { 
  Info, 
  ShieldCheck, 
  BookOpen, 
  Compass, 
  Clock, 
  Heart, 
  ExternalLink,
  Mail,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { WaqtoLogo } from './WaqtoLogo';

export const AboutView: React.FC = () => {
  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* Brand Hero Card */}
      <div className="bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0d4430] text-white rounded-3xl p-6 shadow-md border border-emerald-500/20 text-center space-y-3 relative overflow-hidden">
        <WaqtoLogo size={80} className="mx-auto shadow-md" />
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">
            Muslim Reminder
          </h1>
          <p className="text-xs text-emerald-200 font-medium mt-0.5">
            মুসলিম রিমাইন্ডার • আপনার দ্বীনের সঙ্গী
          </p>
          <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-mono border border-emerald-500/30">
            ভার্সন ১.২.০ (Production Edition)
          </div>
        </div>
      </div>

      {/* 1. Core Purpose & Philosophy */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-2.5">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          অ্যাপের মূল লক্ষ্য ও দর্শন
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
          <strong>মুসলিম রিমাইন্ডার (Muslim Reminder)</strong> একটি পূর্ণাঙ্গ, নির্ভরযোগ্য, শতভাগ গোপনীয়তা-প্রধান এবং বিজ্ঞাপনমুক্ত ইসলামিক সহায়ক অ্যাপ্লিকেশন। এর মূল উদ্দেশ্য একজন মুসলিমের প্রাত্যহিক সালাত, কুরআন তিলাওয়াত, দোয়া ও সুন্নাহ চর্চাকে সহজ, সুন্দর এবং বিশুদ্ধ রাখা।
        </p>
      </div>

      {/* 2. Verified Authentic Sources */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          বিশুদ্ধ রেফারেন্স ও তথ্যের উৎস
        </h2>

        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-1">
            <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>নামাজের সময় ও রমজান ক্যালেন্ডার</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
              ইসলামিক ফাউন্ডেশন বাংলাদেশ এবং করাচি ইসলামিক বিজ্ঞান বিশ্ববিদ্যালয় (Karachi Standard) অনুযায়ী সূর্যোদয় ও সূর্যাস্তের অ্যাস্ট্রোনমিকাল ডিগ্রির ওপর ভিত্তি করে বাংলাদেশের ৬৪ জেলার জন্য নির্ভুলভাবে গণনাকৃত।
            </p>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-1">
            <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>কিবলার দিক ও ডিগ্রি</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
              মক্কা শরিফের কাবার ভৌগোলিক কোঅর্ডিনেট (21.4225° N, 39.8262° E) অনুযায়ী গ্রেট সার্কেল জিওডেসিক সমীকরণ ও ডিভাইসের ম্যাগনেটোমিটার সেন্সর দ্বারা পরিচালিত।
            </p>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-1">
            <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>কুরআন, হাদিস ও দোয়া সংকলন</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
              উসমানী ক্যালিগ্রাফি টেক্সট, সহিহ আল-বুখারি, সহিহ মুসলিম, রিয়াদুস সালেহীন এবং শায়খ সাঈদ ইবন আলী আল-কাহতানীর রচিত বিশ্বখ্যাত “হিসনুল মুসলিম” গ্রন্থ থেকে সম্পূর্ণ প্রামাণ্যভাবে সংকলিত।
            </p>
          </div>
        </div>
      </div>

      {/* 3. Strict Privacy Statement */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-2">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>শতভাগ অফলাইন ও গোপনীয়তার প্রতিশ্রুতি</span>
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-normal">
          Muslim Reminder অ্যাপে কোনো বিজ্ঞাপন নেই, কোনো তৃতীয় পক্ষের ট্র্যাকার নেই। আপনার ব্যক্তিগত সালাত ট্র্যাকিং, নোট বা বুকমার্কের কোনো ডেটা কোনো দূরবর্তী সার্ভারে পাঠানো হয় না। সকল ডেটা সম্পূর্ণ আপনার ডিভাইসের ভেতর সংরক্ষিত থাকে।
        </p>
      </div>

      {/* 4. Feedback & Contact */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-2.5">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          যোগাযোগ ও মতামত
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-normal">
          অ্যাপ সম্পর্কে আপনার কোনো মূল্যবান পরামর্শ, ত্রুটি সংশোধন বা মতামত থাকলে অনুগ্রহ করে আমাদের জানান:
        </p>
        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-emerald-700 dark:text-emerald-400 select-all">
          nafiulislam3810@gmail.com
        </div>
      </div>

      {/* Dedicated Supplication footer */}
      <div className="text-center text-xs text-stone-500 dark:text-stone-400 italic py-2">
        “রাব্বি জিদনি ইলমা” — হে আমার প্রতিপালক! আমাকে জ্ঞানে বৃদ্ধি দান করুন।
      </div>
    </div>
  );
};
