import React from 'react';
import { ArrowUp, ArrowDown, Bone } from 'lucide-react';
import { Language } from '../types/game';
import { TRANSLATIONS } from '../utils/gameData';

interface TouchControlsProps {
  onJump: () => void;
  onSlide: () => void;
  onBoost: () => void;
  hasBone: boolean;
  language: Language;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onJump,
  onSlide,
  onBoost,
  hasBone,
  language,
}) => {
  const t = TRANSLATIONS[language];

  const handleTouch = (action: () => void, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) {
      navigator.vibrate(18);
    }
    action();
  };

  return (
    <div className="absolute inset-x-0 bottom-3 px-3 sm:px-4 flex items-end justify-between pointer-events-none select-none z-30 font-mono">
      {/* Left zone: Pixel Slide & Pixel Boost */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
        {/* Slide Button (Pixelated arcade orange) */}
        <button
          type="button"
          onTouchStart={(e) => handleTouch(onSlide, e)}
          onMouseDown={(e) => handleTouch(onSlide, e)}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-[#D97706] hover:bg-[#F59E0B] border-4 border-black text-black shadow-[4px_4px_0px_#000000] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-none relative ring-2 ring-inset ring-amber-300/60"
          aria-label={t.slide}
        >
          {/* Top highlight bar for 16-bit bevel look */}
          <div className="absolute top-0.5 inset-x-1 h-1 bg-white/40 pointer-events-none" />
          <ArrowDown className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" />
          <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase mt-0.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
            {t.slide}
          </span>
        </button>

        {/* Boost / Throw Banana Trap Button (Pixelated arcade red) */}
        {hasBone && (
          <button
            type="button"
            onTouchStart={(e) => handleTouch(onBoost, e)}
            onMouseDown={(e) => handleTouch(onBoost, e)}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-[#DC2626] hover:bg-[#EF4444] border-4 border-black text-white shadow-[4px_4px_0px_#000000] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-none relative ring-2 ring-inset ring-red-300/60 animate-bounce"
            aria-label={t.boost}
          >
            <div className="absolute top-0.5 inset-x-1 h-1 bg-white/40 pointer-events-none" />
            <Bone className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase mt-0.5">
              {t.boost}
            </span>
          </button>
        )}
      </div>

      {/* Right zone: Pixel Jump Button (Pixelated arcade cyan/blue) */}
      <div className="pointer-events-auto">
        <button
          type="button"
          onTouchStart={(e) => handleTouch(onJump, e)}
          onMouseDown={(e) => handleTouch(onJump, e)}
          className="w-20 h-20 sm:w-24 sm:h-24 bg-[#0284C7] hover:bg-[#38BDF8] border-4 border-black text-black shadow-[4px_4px_0px_#000000] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-none relative ring-2 ring-inset ring-sky-200/60"
          aria-label={t.jump}
        >
          {/* Top highlight bar */}
          <div className="absolute top-0.5 inset-x-1 h-1.5 bg-white/50 pointer-events-none" />
          <ArrowUp className="w-9 h-9 sm:w-11 sm:h-11 stroke-[3.5]" />
          <span className="text-xs sm:text-sm font-black tracking-widest uppercase mt-0.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
            {t.jump}
          </span>
        </button>
      </div>
    </div>
  );
};
