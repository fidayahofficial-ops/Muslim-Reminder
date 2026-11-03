import React from 'react';
import { Home, Clock, CheckCircle2, BookOpen, Compass } from 'lucide-react';
import { TabType } from '../types';
import { triggerHaptic } from '../utils/audio';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = React.memo(({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as TabType, labelBn: 'হোম', icon: Home },
    { id: 'prayers' as TabType, labelBn: 'সালাত', icon: Clock },
    { id: 'amal' as TabType, labelBn: 'আমল', icon: CheckCircle2 },
    { id: 'quran' as TabType, labelBn: 'কুরআন', icon: BookOpen },
    { id: 'more' as TabType, labelBn: 'এক্সপ্লোর', icon: Compass }
  ];

  const handleTabClick = (tabId: TabType) => {
    triggerHaptic(15);
    onTabChange(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131b17]/95 text-stone-700 dark:text-stone-200 backdrop-blur-md border-t border-emerald-950/10 dark:border-emerald-500/15 shadow-[0_-4px_24px_rgba(18,100,70,0.06)] safe-bottom gpu-layer">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[52px] min-w-[48px] transition-all relative cursor-pointer select-none py-1 group ${
                isActive
                  ? 'text-[#177a56] dark:text-emerald-400 font-bold'
                  : 'text-stone-600 hover:text-[#177a56] dark:text-stone-400 dark:hover:text-emerald-300 font-medium'
              }`}
            >
              <div className={`relative px-3 py-1 rounded-xl transition-all ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/50 scale-105' : 'group-hover:bg-stone-50 dark:group-hover:bg-stone-900/50'}`}>
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-[#177a56] dark:text-emerald-400 stroke-[2.4]' : 'text-stone-500 dark:text-stone-400 stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#177a56] dark:bg-emerald-400 rounded-full" />
                )}
              </div>
              <span className={`text-[12px] sm:text-[13px] mt-0.5 leading-snug tracking-tight ${isActive ? 'font-bold text-[#177a56] dark:text-emerald-400' : 'text-stone-600 dark:text-stone-400'}`}>
                {tab.labelBn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

