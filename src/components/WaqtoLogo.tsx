import React from 'react';

interface WaqtoLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const WaqtoLogo: React.FC<WaqtoLogoProps> = ({ 
  className = "", 
  size = 36, 
  showText = false 
}) => {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      <div 
        className={`relative flex items-center justify-center shrink-0 rounded-2xl overflow-hidden transition-transform duration-200 active:scale-95 ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src="/app-logo.png"
          alt="Muslim Reminder (মুসলিম রিমাইন্ডার)"
          className="w-full h-full object-contain filter drop-shadow-xs select-none pointer-events-none rounded-xl"
          loading="eager"
          decoding="async"
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-[#177a56] dark:text-emerald-400 select-none leading-tight">
            Muslim Reminder
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-stone-500 dark:text-stone-400 select-none leading-none mt-0.5">
            মুসলিম রিমাইন্ডার
          </span>
        </div>
      )}
    </div>
  );
};
