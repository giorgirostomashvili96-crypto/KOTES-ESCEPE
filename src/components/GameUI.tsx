import React, { useState } from 'react';
import {
  Trophy,
  Coins,
  Gauge,
  Flame,
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  Shield,
  Zap,
  Bone,
  Magnet,
  Maximize2,
  X,
  Check,
  Sparkles,
  ArrowRight,
  Smile,
  Home,
  Download,
  Smartphone,
  Package,
} from 'lucide-react';
import { GameStatus, GameStats, ActivePowerUp, Language, CharacterSkin } from '../types/game';
import { TRANSLATIONS, LEVEL_CONFIGS, CHARACTERS } from '../utils/gameData';
import { soundEngine } from '../audio/soundEngine';
import { spriteCache, createProceduralPlayerCanvas } from '../utils/spriteLoader';

const CharacterAvatar: React.FC<{ skin: CharacterSkin; name: string; badgeEmoji?: string }> = ({ skin, badgeEmoji }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (skin === 'classic' && spriteCache.playerPortrait && spriteCache.playerPortrait.width > 0) {
      ctx.drawImage(spriteCache.playerPortrait, 0, 0, canvas.width, canvas.height);
    } else {
      const proc = createProceduralPlayerCanvas('portrait', skin);
      ctx.drawImage(proc, 0, 0, canvas.width, canvas.height);
    }
  }, [skin]);

  return (
    <div className="w-16 h-20 rounded-none bg-[#1C0E07] border-2 border-black overflow-hidden flex items-center justify-center mb-2 relative shadow-inner">
      <canvas
        ref={canvasRef}
        width={140}
        height={155}
        className="w-full h-full object-contain filter drop-shadow-md"
      />
      {badgeEmoji && (
        <span className="absolute top-1 right-1 text-xs bg-black/80 px-1 py-0.5 border border-amber-500/60 rounded-none font-black leading-none">
          {badgeEmoji}
        </span>
      )}
    </div>
  );
};

interface GameUIProps {
  status: GameStatus;
  stats: GameStats;
  activePowerUps: ActivePowerUp[];
  language: Language;
  isMuted: boolean;
  selectedSkin: CharacterSkin;
  onSelectSkin: (skin: CharacterSkin) => void;
  onStart: (level?: number) => void;
  onResume: () => void;
  onPause: () => void;
  onGoToMenu: () => void;
  onToggleSound: () => void;
  onToggleLanguage: () => void;
  onToggleFullscreen: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  status,
  stats,
  activePowerUps,
  language,
  isMuted,
  selectedSkin,
  onSelectSkin,
  onStart,
  onResume,
  onPause,
  onGoToMenu,
  onToggleSound,
  onToggleLanguage,
  onToggleFullscreen,
}) => {
  const t = TRANSLATIONS[language];
  const currentLevelCfg = LEVEL_CONFIGS[stats.level - 1] || LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
  const levelName = language === 'ka' ? currentLevelCfg.nameKa : currentLevelCfg.nameEn;

  // Active modal inside title menu:
  // 'NONE' | 'LEVEL_SELECT' | 'CHARACTER_SELECT' | 'SETTINGS' | 'EXIT_CONFIRM' | 'GODOT_EXPORT'
  const [activeModal, setActiveModal] = useState<
    'NONE' | 'LEVEL_SELECT' | 'CHARACTER_SELECT' | 'SETTINGS' | 'EXIT_CONFIRM' | 'GODOT_EXPORT'
  >('NONE');

  // Graphics joke setting state
  const [selectedQuality, setSelectedQuality] = useState<string>('kote_x5');

  // Unlocked skins persistence
  const [unlockedSkins, setUnlockedSkins] = useState<CharacterSkin[]>(() => {
    try {
      const saved = localStorage.getItem('kote_unlocked_skins');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return ['classic'];
  });

  // Shop notification feedback toast
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);

  const handlePurchaseOrSelect = (char: (typeof CHARACTERS)[0]) => {
    const isUnlocked = unlockedSkins.includes(char.id);
    if (isUnlocked) {
      soundEngine.playJump();
      onSelectSkin(char.id);
      setShopFeedback(language === 'ka' ? `ჩაიცვი: ${char.nameKa}!` : `Equipped: ${char.nameEn}!`);
      setTimeout(() => setShopFeedback(null), 2500);
      return;
    }

    // Check if player has enough toilet paper coins
    const currentCoins = stats.coins;
    if (currentCoins < char.price) {
      soundEngine.playHit();
      setShopFeedback(
        language === 'ka'
          ? `❌ ქოინები არ გყოფნის! საჭიროა ${char.price} 🧻 (გაქვს ${currentCoins} 🧻)`
          : `❌ Not enough coins! Needs ${char.price} 🧻 (You have ${currentCoins} 🧻)`
      );
      setTimeout(() => setShopFeedback(null), 3000);
      return;
    }

    // Deduct coins & save
    const newCoins = currentCoins - char.price;
    stats.coins = newCoins;
    localStorage.setItem('pixel_runner_coins', newCoins.toString());
    const newUnlocked = [...unlockedSkins, char.id];
    setUnlockedSkins(newUnlocked);
    localStorage.setItem('kote_unlocked_skins', JSON.stringify(newUnlocked));

    soundEngine.playLevelUp();
    onSelectSkin(char.id);
    setShopFeedback(
      language === 'ka'
        ? `🎉 გილოცავთ! იყიდეთ ${char.nameKa} (-${char.price} 🧻)!`
        : `🎉 Purchased ${char.nameEn} (-${char.price} 🧻)!`
    );
    setTimeout(() => setShopFeedback(null), 3500);
  };

  // Proximity threat calculation (0 to 100%)
  const dangerPercent = Math.min(
    100,
    Math.max(0, Math.round(((220 - stats.dogDistance) / 195) * 100))
  );
  const isHighDanger = stats.dogDistance < 90;

  const playClickSound = () => {
    soundEngine.playJump();
  };

  return (
    <>
      {/* ================= IN-GAME TOP HUD CLUSTER (PIXEL ART STYLE) ================= */}
      {status === 'PLAYING' && (
        <div className="absolute top-0 inset-x-0 p-2 sm:p-3 md:p-4 flex items-center justify-between pointer-events-none select-none z-20 font-mono">
          {/* Left cluster: Score, Coins, Distance */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {/* Toilet Paper Rolls Counter */}
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-[#1E293B] border-2 border-black shadow-[2px_2px_0px_#000000] text-slate-100 font-black tabular-nums text-xs sm:text-sm" title={t.coins}>
              <span className="text-sm">🧻</span>
              <span>{stats.coins}</span>
            </div>

            {/* Distance */}
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-[#1F2937] border-2 border-black shadow-[2px_2px_0px_#000000] text-sky-300 font-black tabular-nums text-xs sm:text-sm">
              <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
              <span>
                {stats.distance}{t.meters}
              </span>
            </div>

            {/* Score & Multiplier */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#3B124D] border-2 border-black shadow-[2px_2px_0px_#000000] text-purple-300 font-black tabular-nums text-xs sm:text-sm">
              <Trophy className="w-4 h-4 text-purple-400" />
              <span>{stats.score}</span>
              {stats.multiplier > 1 && (
                <span className="text-[10px] bg-purple-600 text-purple-100 px-1 font-black">
                  x{stats.multiplier}
                </span>
              )}
            </div>
          </div>

          {/* Center: Chaser Threat Proximity Radar */}
          <div className="flex flex-col items-center pointer-events-auto max-w-[130px] sm:max-w-[200px] w-full mx-1.5">
            <div className="flex items-center justify-between w-full text-[10px] sm:text-xs font-black tracking-tight mb-1 text-slate-200 drop-shadow">
              <span className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded-none overflow-hidden border-2 border-black bg-black flex-shrink-0 ${isHighDanger ? 'animate-pulse' : ''}`}>
                  <img
                    src="/assets/aistudio/____________b3632765.png"
                    alt="Chaser"
                    className="w-full h-full object-cover object-top scale-175 translate-y-0.5"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="truncate">{t.dogDanger}</span>
              </span>
              <span
                className={`tabular-nums ${
                  isHighDanger ? 'text-red-400 font-black animate-pulse' : 'text-slate-300'
                }`}
              >
                {stats.dogDistance}px
              </span>
            </div>

            {/* Radar Progress Bar with Pixel Border */}
            <div className="w-full h-2.5 sm:h-3 bg-[#1C1917] border-2 border-black p-0.5 shadow-[1px_1px_0px_#000000]">
              <div
                className={`h-full transition-all duration-150 ${
                  isHighDanger
                    ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                    : dangerPercent > 50
                    ? 'bg-amber-500 shadow-[0_0_6px_#f59e0b]'
                    : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                }`}
                style={{ width: `${dangerPercent}%` }}
              />
            </div>
          </div>

          {/* Right cluster: Level tag & Pixel Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
            {/* Level Tag */}
            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-[#2E1A11] border-2 border-black shadow-[2px_2px_0px_#000000] text-xs font-black text-amber-200">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>
                L{stats.level}
              </span>
            </div>

            {/* Go To Menu Button (Requested by user!) */}
            <button
              onClick={() => {
                playClickSound();
                onGoToMenu();
              }}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[#B45309] hover:bg-[#D97706] border-2 border-black text-amber-100 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1 text-[11px] sm:text-xs font-black cursor-pointer"
              title={t.mainMenu}
              aria-label={t.mainMenu}
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{language === 'ka' ? 'მენიუ' : 'MENU'}</span>
            </button>

            {/* Pause button */}
            <button
              onClick={onPause}
              className="p-1 sm:p-1.5 bg-[#431407] hover:bg-[#7C2D12] border-2 border-black text-amber-200 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              title={t.paused}
              aria-label={t.paused}
            >
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className="p-1 sm:p-1.5 bg-[#1C1917] hover:bg-[#292524] border-2 border-black text-slate-300 hover:text-white shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              title={t.sound}
              aria-label={t.sound}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              )}
            </button>

            {/* Language Toggle */}
            <button
              onClick={onToggleLanguage}
              className="px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#1C1917] hover:bg-[#292524] border-2 border-black text-amber-400 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-[10px] sm:text-xs font-black cursor-pointer"
              title={t.language}
            >
              {language === 'ka' ? 'GEO' : 'ENG'}
            </button>

            {/* Fullscreen button */}
            <button
              onClick={onToggleFullscreen}
              className="hidden lg:flex p-1 sm:p-1.5 bg-[#1C1917] hover:bg-[#292524] border-2 border-black text-slate-300 hover:text-white shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              title="Fullscreen"
              aria-label="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= ACTIVE POWERUPS BADGE ROW ================= */}
      {status === 'PLAYING' && activePowerUps.length > 0 && (
        <div className="absolute top-16 left-4 flex flex-col gap-1.5 pointer-events-none select-none z-20">
          {activePowerUps.map((p) => {
            const icons = {
              magnet: <Magnet className="w-3.5 h-3.5 text-red-400" />,
              speed: <Zap className="w-3.5 h-3.5 text-yellow-400" />,
              bone: <Bone className="w-3.5 h-3.5 text-amber-200" />,
              shield: <Shield className="w-3.5 h-3.5 text-cyan-400" />,
            };
            const labels = {
              magnet: language === 'ka' ? 'მაგნიტი' : 'Magnet',
              speed: language === 'ka' ? 'აჩქარება' : 'Sprint',
              bone: language === 'ka' ? 'ძვალი' : 'Bone',
              shield: language === 'ka' ? 'ფარი' : 'Shield',
            };

            return (
              <div
                key={p.type}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2E1A11]/95 border-2 border-[#7C4A27] rounded-lg text-xs font-bold text-amber-100 shadow-md backdrop-blur-sm"
              >
                {icons[p.type]}
                <span className="text-[11px] font-black">{labels[p.type]}</span>
                <span className="text-[10px] text-amber-300 tabular-nums">
                  {Math.ceil(p.remaining)}s
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= HIGH THREAT SCREEN ALERT ================= */}
      {status === 'PLAYING' && isHighDanger && (
        <div className="absolute top-16 inset-x-0 flex justify-center pointer-events-none z-20">
          <div className="px-4 py-1.5 bg-red-600/95 border-2 border-red-400 text-white text-xs sm:text-sm font-black tracking-wide rounded-full shadow-lg shadow-red-900/60 animate-bounce flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 animate-spin" />
            <span>{t.dogWarning}</span>
          </div>
        </div>
      )}

      {/* ================= AUTHENTIC MAIN MENU (EXACT USER ARTWORK & BUTTONS) ================= */}
      {status === 'TITLE' && (
        <div className="absolute inset-0 z-40 bg-[#0C0A09] flex items-center justify-center overflow-hidden select-none">
          {/* Blurred Atmospheric Background extending the castle artwork to full viewport */}
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-40 pointer-events-none"
            style={{ backgroundImage: `url('/assets/aistudio/____________cea15749.png')` }}
          />

          {/* Artwork Stage Container: Preserves 462x1024 Aspect Ratio */}
          <div className="relative h-full max-h-[100dvh] aspect-[462/1024] flex items-center justify-center shadow-2xl shadow-black overflow-hidden border-x border-[#3D312A]/60">
            {/* The Exact User Background Image */}
            <img
              src="/assets/aistudio/____________cea15749.png"
              alt="კოტეს ესქეიფი მთავარი მენიუ"
              className="w-full h-full object-cover object-center pointer-events-none select-none"
              referrerPolicy="no-referrer"
            />

            {/* Quick Top bar overlay for Levels, Skins, Sound & Language & Godot/APK */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 sm:gap-2 z-30 font-mono">
              <button
                onClick={() => {
                  playClickSound();
                  setActiveModal('CHARACTER_SELECT');
                }}
                className="px-2.5 py-1.5 bg-[#451A03]/95 hover:bg-[#5E2405] border-2 border-black rounded-none text-xs font-black text-amber-300 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-none cursor-pointer flex items-center gap-1 uppercase"
                title="კოტეს სკინების მაღაზია"
              >
                <span>👗</span>
                <span>{language === 'ka' ? 'სკინები' : 'SKINS'}</span>
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setActiveModal('GODOT_EXPORT');
                }}
                className="px-2.5 py-1.5 bg-gradient-to-r from-[#4338CA] to-[#3730A3] hover:from-[#4F46E5] hover:to-[#4338CA] border-2 border-black rounded-none text-xs font-black text-white shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-none cursor-pointer flex items-center gap-1.5 uppercase animate-pulse hover:animate-none"
                title="Godot 4 Project & Android APK"
              >
                <span>📦</span>
                <span>{language === 'ka' ? 'Godot / APK' : 'GODOT / APK'}</span>
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setActiveModal('LEVEL_SELECT');
                }}
                className="px-2.5 py-1.5 bg-[#2D241E]/95 hover:bg-[#3D322B] border-2 border-black rounded-none text-xs font-black text-amber-300 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-none cursor-pointer flex items-center gap-1 uppercase"
                title={t.selectLevel}
              >
                <span>⭐</span>
                <span>{language === 'ka' ? 'დონეები' : 'LEVELS'}</span>
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  onToggleSound();
                }}
                className="p-1.5 bg-[#2D241E]/95 hover:bg-[#3D322B] border-2 border-black rounded-none text-amber-300 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-none cursor-pointer"
                title={t.sound}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  onToggleLanguage();
                }}
                className="px-2.5 py-1.5 bg-[#2D241E]/95 hover:bg-[#3D322B] border-2 border-black rounded-none text-xs font-black text-amber-300 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-none cursor-pointer uppercase"
                title={t.language}
              >
                {language === 'ka' ? 'GEO' : 'ENG'}
              </button>
            </div>

            {/* ================= 4 INTERACTIVE OVERLAY BUTTONS ================= */}
            {/* BUTTON 1: "თამაშის დაწყება" (Starts playing directly with Kote!) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onStart(1);
              }}
              className="absolute left-[4.8%] top-[55.4%] w-[44.2%] h-[7.2%] rounded-xl cursor-pointer group transition-all duration-150 active:scale-[0.97] focus:outline-none"
              aria-label={t.startGame}
            >
              <span className="absolute inset-0 rounded-xl border-2 border-amber-400/0 group-hover:border-amber-400/90 group-hover:bg-amber-400/15 group-active:bg-amber-500/25 transition-all shadow-[0_0_15px_rgba(251,191,36,0)] group-hover:shadow-[0_0_18px_rgba(251,191,36,0.6)]" />
            </button>

            {/* BUTTON 2: "პერსონაჟის არჩევა" */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveModal('CHARACTER_SELECT');
              }}
              className="absolute left-[4.8%] top-[64.3%] w-[44.2%] h-[7.2%] rounded-xl cursor-pointer group transition-all duration-150 active:scale-[0.97] focus:outline-none"
              aria-label={t.selectCharacter}
            >
              <span className="absolute inset-0 rounded-xl border-2 border-amber-400/0 group-hover:border-amber-400/90 group-hover:bg-amber-400/15 group-active:bg-amber-500/25 transition-all shadow-[0_0_15px_rgba(251,191,36,0)] group-hover:shadow-[0_0_18px_rgba(251,191,36,0.6)]" />
            </button>

            {/* BUTTON 3: "პარამეტრები" (Opens Kote's x5 joke quote popup!) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveModal('SETTINGS');
              }}
              className="absolute left-[4.8%] top-[73.2%] w-[44.2%] h-[6.8%] rounded-xl cursor-pointer group transition-all duration-150 active:scale-[0.97] focus:outline-none"
              aria-label={t.settings}
            >
              <span className="absolute inset-0 rounded-xl border-2 border-amber-400/0 group-hover:border-amber-400/90 group-hover:bg-amber-400/15 group-active:bg-amber-500/25 transition-all shadow-[0_0_15px_rgba(251,191,36,0)] group-hover:shadow-[0_0_18px_rgba(251,191,36,0.6)]" />
            </button>

            {/* BUTTON 4: "გასვლა" */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveModal('EXIT_CONFIRM');
              }}
              className="absolute left-[4.8%] top-[81.8%] w-[44.2%] h-[6.8%] rounded-xl cursor-pointer group transition-all duration-150 active:scale-[0.97] focus:outline-none"
              aria-label={t.exit}
            >
              <span className="absolute inset-0 rounded-xl border-2 border-red-400/0 group-hover:border-red-400/90 group-hover:bg-red-400/15 group-active:bg-red-500/25 transition-all shadow-[0_0_15px_rgba(239,68,68,0)] group-hover:shadow-[0_0_18px_rgba(239,68,68,0.6)]" />
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: ლეველების არჩევა (LEVEL SELECT) ================= */}
      {status === 'TITLE' && activeModal === 'LEVEL_SELECT' && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in zoom-in-95 duration-150 font-mono">
          <div className="max-w-xl w-full bg-gradient-to-b from-[#3D2516] via-[#2A170C] to-[#1C0E07] border-4 border-black rounded-none p-5 sm:p-6 text-center shadow-[6px_6px_0px_#000000] relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-black">
              <div className="text-left">
                <h2 className="text-2xl sm:text-3xl font-black text-[#FDE68A] tracking-tight uppercase">
                  {t.selectLevel}
                </h2>
                <p className="text-xs text-amber-200/70">{t.selectLevelDesc}</p>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setActiveModal('NONE');
                }}
                className="p-1.5 bg-[#42220D] hover:bg-[#5E3214] border-2 border-black rounded-none text-amber-200 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Level List */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {LEVEL_CONFIGS.map((level, idx) => {
                const title = language === 'ka' ? level.nameKa : level.nameEn;
                const stars = '⭐'.repeat(idx + 1);

                return (
                  <div
                    key={level.levelNumber}
                    className="p-3 bg-gradient-to-r from-[#4A2814] to-[#361B0C] border-2 border-black rounded-none flex items-center justify-between gap-3 shadow-[3px_3px_0px_#000000] hover:border-amber-400 group"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 bg-[#241107] border-2 border-black rounded-none flex items-center justify-center text-amber-300 font-black text-base shadow-inner">
                        {level.levelNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-black text-[#FEF3C7] group-hover:text-amber-300">
                            {title}
                          </h3>
                          <span className="text-xs">{stars}</span>
                        </div>
                        <p className="text-[11px] text-amber-300/70 tabular-nums">
                          {level.speed} px/s · {level.targetDistance} {t.meters}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        playClickSound();
                        setActiveModal('NONE');
                        onStart(level.levelNumber);
                      }}
                      className="px-3.5 py-2 bg-[#F59E0B] hover:bg-[#FBBF24] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black font-mono font-black text-xs border-3 border-black shadow-[3px_3px_0px_#000000] rounded-none flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                    >
                      <span>{t.playLevel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: პარამეტრები (SETTINGS WITH KOTE'S JOKE) ================= */}
      {status === 'TITLE' && activeModal === 'SETTINGS' && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in zoom-in-95 duration-150 font-mono">
          <div className="max-w-md w-full bg-gradient-to-b from-[#3D2516] via-[#2A170C] to-[#1C0E07] border-4 border-black rounded-none p-6 text-center shadow-[6px_6px_0px_#000000] relative overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => {
                playClickSound();
                setActiveModal('NONE');
              }}
              className="absolute top-4 right-4 p-1.5 bg-[#42220D] hover:bg-[#5E3214] border-2 border-black text-amber-200 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Kote Avatar & Speech Bubble */}
            <div className="w-20 h-20 mx-auto rounded-none overflow-hidden border-4 border-black shadow-[4px_4px_0px_#000000] mb-4 bg-slate-900">
              <img
                src="/assets/aistudio/____________cea15749.png"
                alt="Kote"
                className="w-full h-full object-cover object-top scale-150 translate-y-2"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* The Famous Requested Quote in Warm Golden Wooden Plaque */}
            <div className="p-4 bg-gradient-to-r from-[#593116] via-[#6B3B1B] to-[#593116] border-2 border-black shadow-[3px_3px_0px_#000000] mb-5">
              <h3 className="text-base sm:text-lg font-black text-[#FEF08A] tracking-tight leading-snug">
                "{t.koteSettingsQuote}"
              </h3>
              <p className="mt-1 text-xs text-amber-200/80 font-medium">
                {t.koteSettingsSub}
              </p>
            </div>

            {/* Humorous Quality Choices */}
            <div className="space-y-2 text-left mb-5">
              <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider">
                გრაფიკის რეჟიმი (Graphics Preset):
              </span>
              {[
                { id: 'ultra', label: '4K RTX Ultra (კოტე არ გირჩევს, გაცხელდება)' },
                { id: 'kote_x5', label: 'კოტეს x5 ექსტრემალური პიქსელები (რეკომენდებული)' },
                { id: 'potato', label: 'კარტოფილი რეჟიმი (მაინც იფრენს)' },
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuality(q.id)}
                  className={`w-full p-2.5 rounded-none text-xs font-black flex items-center justify-between border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-none cursor-pointer ${
                    selectedQuality === q.id
                      ? 'bg-[#572B10] text-amber-200 ring-2 ring-inset ring-amber-400'
                      : 'bg-[#291409] text-amber-200/60 hover:text-amber-200'
                  }`}
                >
                  <span>{q.label}</span>
                  {selectedQuality === q.id && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
            </div>

            {/* Audio Controls */}
            <div className="flex items-center justify-between p-3 bg-[#241107] border-2 border-black shadow-[2px_2px_0px_#000000] mb-5 text-xs text-amber-200 font-black">
              <span>{t.sound}: {isMuted ? 'გათიშული' : 'ჩართული'}</span>
              <button
                onClick={onToggleSound}
                className="px-3 py-1.5 bg-[#4A2610] hover:bg-[#613317] border-2 border-black text-amber-300 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer uppercase text-xs"
              >
                {isMuted ? 'ჩართვა' : 'გათიშვა'}
              </button>
            </div>

            {/* Big Action Button: "წადი ითამაშე!" (Pixel Art Style) */}
            <button
              onClick={() => {
                playClickSound();
                setActiveModal('NONE');
                onStart();
              }}
              className="w-full py-3.5 px-6 bg-[#F59E0B] hover:bg-[#FBBF24] active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-mono font-black text-base border-4 border-black shadow-[4px_4px_0px_#000000] rounded-none flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>წადი ითამაშე! 🚀</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: პერსონაჟის არჩევა (CHARACTER SELECT) ================= */}
      {(status === 'TITLE' || status === 'GAMEOVER') && activeModal === 'CHARACTER_SELECT' && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in zoom-in-95 duration-150 font-mono">
          <div className="max-w-xl w-full bg-gradient-to-b from-[#3D2516] via-[#2A170C] to-[#1C0E07] border-4 border-black rounded-none p-5 sm:p-6 text-center shadow-[6px_6px_0px_#000000] relative overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b-2 border-black gap-2">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-black text-[#FDE68A] tracking-tight uppercase">
                    {language === 'ka' ? 'კოტეს სკინების მაღაზია' : "Kote's Outfit Shop"}
                  </h2>
                  <span className="text-xs bg-amber-500 text-black px-1.5 py-0.5 font-black border border-black shadow-[1px_1px_0px_#000]">
                    9 სკინი
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80">
                  {language === 'ka'
                    ? '✨ სახე უცვლელია! იყიდე ქოინებით და ჩააცვი კოტეს ახალი ფორმები'
                    : '✨ Authentic face preserved! Buy outfits with toilet paper rolls'}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* Current Coin Balance */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] border-2 border-amber-400 text-amber-300 font-mono font-black text-xs sm:text-sm shadow-[2px_2px_0px_#000000]">
                  <span>🧻</span>
                  <span>{stats.coins}</span>
                  <span className="text-[10px] text-amber-200/70">{t.coins}</span>
                </div>

                <button
                  onClick={() => {
                    playClickSound();
                    setActiveModal('NONE');
                  }}
                  className="p-1.5 bg-[#42220D] hover:bg-[#5E3214] border-2 border-black text-amber-200 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  title="დახურვა"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Shop Feedback Banner */}
            {shopFeedback && (
              <div className="mb-3 p-2 bg-[#2E1065] border-2 border-amber-400 text-amber-200 text-xs font-black text-center shadow-[2px_2px_0px_#000000] animate-in fade-in slide-in-from-top-1">
                {shopFeedback}
              </div>
            )}

            {/* Scrollable Character Cards Grid (All 9 Outfits) */}
            <div className="max-h-[56vh] overflow-y-auto pr-1 sm:pr-1.5 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {CHARACTERS.map((char) => {
                const isSelected = selectedSkin === char.id;
                const isUnlocked = unlockedSkins.includes(char.id) || char.price === 0;
                const name = language === 'ka' ? char.nameKa : char.nameEn;
                const canAfford = stats.coins >= char.price;

                return (
                  <div
                    key={char.id}
                    onClick={() => handlePurchaseOrSelect(char)}
                    className={`p-3 rounded-none border-3 border-black flex flex-col items-center justify-between cursor-pointer transition-none relative ${
                      isSelected
                        ? 'bg-[#592F13] shadow-[4px_4px_0px_#F59E0B] ring-2 ring-amber-400'
                        : isUnlocked
                        ? 'bg-[#291409] shadow-[3px_3px_0px_#000000] hover:bg-[#381B0C]'
                        : 'bg-[#1C0E07]/90 shadow-[3px_3px_0px_#000000] hover:bg-[#281308]'
                    }`}
                  >
                    {/* Badge / Price tag */}
                    <div className="w-full flex items-center justify-between mb-1.5">
                      <span className="text-xs px-1.5 py-0.5 bg-black/60 border border-amber-500/40 text-amber-300 font-black">
                        {char.badgeEmoji}
                      </span>
                      {isUnlocked ? (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 border border-emerald-500/50">
                          ხელმისაწვდომია ✓
                        </span>
                      ) : (
                        <span className={`text-[11px] font-black px-1.5 py-0.5 border ${canAfford ? 'bg-amber-950 text-amber-300 border-amber-500' : 'bg-red-950/80 text-red-300 border-red-700'}`}>
                          {char.price} 🧻
                        </span>
                      )}
                    </div>

                    {/* Character Avatar Preview */}
                    <CharacterAvatar skin={char.id} name={name} badgeEmoji={char.badgeEmoji} />

                    <div className="text-center w-full my-1">
                      <h4 className="text-xs sm:text-sm font-black text-amber-200">{name}</h4>
                      <p className="text-[10px] text-amber-300/80 font-bold mb-1.5">{char.titleKa}</p>
                      <p className="text-[10px] text-amber-100/70 leading-snug min-h-[40px] text-left">
                        {char.descriptionKa}
                      </p>
                    </div>

                    {/* Action Button: Select vs Buy */}
                    {isUnlocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchaseOrSelect(char);
                        }}
                        className={`w-full mt-2 py-1.5 text-xs font-mono font-black border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none rounded-none uppercase tracking-wider cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-black'
                            : 'bg-[#3D1E0C] text-amber-300 hover:bg-[#4D2710]'
                        }`}
                      >
                        {isSelected ? 'არჩეულია ✓' : 'არჩევა'}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchaseOrSelect(char);
                        }}
                        className={`w-full mt-2 py-1.5 text-xs font-mono font-black border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none rounded-none uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 ${
                          canAfford
                            ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white'
                            : 'bg-[#291409] text-amber-200/50 hover:bg-[#33190C]'
                        }`}
                      >
                        <span>ყიდვა ({char.price} 🧻)</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Confirmation CTA */}
            <button
              onClick={() => {
                playClickSound();
                setActiveModal('NONE');
              }}
              className="w-full py-3 bg-[#F59E0B] hover:bg-[#FBBF24] active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-mono font-black text-sm border-4 border-black shadow-[4px_4px_0px_#000000] rounded-none cursor-pointer uppercase tracking-wider"
            >
              შენახვა და თამაშში დაბრუნება 🚀
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: გასვლა (EXIT CONFIRM) ================= */}
      {status === 'TITLE' && activeModal === 'EXIT_CONFIRM' && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in zoom-in-95 duration-150 font-mono">
          <div className="max-w-sm w-full bg-gradient-to-b from-[#3D2516] via-[#2A170C] to-[#1C0E07] border-4 border-black rounded-none p-6 text-center shadow-[6px_6px_0px_#000000] relative overflow-hidden">
            <h3 className="text-xl font-black text-amber-300 mb-2 uppercase">{t.exitConfirm}</h3>
            <p className="text-xs text-amber-100/80 mb-6">{t.exitWarning}</p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  playClickSound();
                  setActiveModal('NONE');
                  onStart();
                }}
                className="w-full py-3 px-4 bg-[#F59E0B] hover:bg-[#FBBF24] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black font-mono font-black text-sm border-3 border-black shadow-[3px_3px_0px_#000000] rounded-none cursor-pointer uppercase tracking-wider"
              >
                {t.stayAndPlay}
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setActiveModal('NONE');
                }}
                className="w-full py-2.5 px-4 bg-[#241107] hover:bg-[#36190A] border-2 border-black text-amber-300 font-mono font-bold text-xs shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none rounded-none cursor-pointer uppercase"
              >
                მენიუში დარჩენა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: GODOT 4 & APK EXPORT ================= */}
      {activeModal === 'GODOT_EXPORT' && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in zoom-in-95 duration-150 font-mono">
          <div className="max-w-xl w-full max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#2B1B10] via-[#1F120A] to-[#120904] border-4 border-black rounded-none p-4 sm:p-6 text-left shadow-[6px_6px_0px_#000000] relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-700 border-2 border-black flex items-center justify-center text-white text-base">
                  📦
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#FDE68A] tracking-tight uppercase">
                    {language === 'ka' ? 'Godot 4 & APK ექსპორტი' : 'Godot 4 & APK Export'}
                  </h2>
                  <p className="text-[11px] text-amber-300/70">
                    {language === 'ka'
                      ? 'გაუშვით Godot Engine-ში ან დააინსტალირეთ ტელეფონზე'
                      : 'Run in Godot Engine or install on Android phone'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setActiveModal('NONE');
                }}
                className="p-1.5 bg-[#42220D] hover:bg-[#5E3214] border-2 border-black rounded-none text-amber-200 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Godot 4 Ready Project */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#1E1B4B] to-[#312E81] border-3 border-black shadow-[3px_3px_0px_#000000] mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs sm:text-sm font-black text-indigo-200 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span>{language === 'ka' ? 'Godot 4.x პროექტი (ZIP)' : 'Godot 4.x Project (.ZIP)'}</span>
                </span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 border border-indigo-400/40">
                  v4.2 / v4.3 Ready
                </span>
              </div>
              <p className="text-xs text-indigo-100/80 mb-3 leading-relaxed">
                {language === 'ka'
                  ? 'სრული პროექტი GDScript-ით: კოტეს სირბილი/ჩაცურება, მფრინავი რეაქტიული უნიტაზი, ქართული სოფლის პარალაქსი, მდევარი და სენსორული მართვა.'
                  : 'Complete project in GDScript: Kote running & roll, Flying Jet Toilet, Georgian village parallax, chaser and mobile controls.'}
              </p>

              {/* Download Button */}
              <a
                href="/downloads/Kote_Runner_Godot4_Project.zip"
                download="Kote_Runner_Godot4_Project.zip"
                className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-black text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'ka' ? 'გადმოწერე Godot 4 პროექტი (ZIP)' : 'Download Godot 4 Project (.ZIP)'}</span>
              </a>

              {/* Instructions steps */}
              <div className="mt-3 pt-2.5 border-t border-indigo-400/20 text-[11px] text-indigo-200/90 space-y-1">
                <p className="font-bold text-amber-300">
                  {language === 'ka' ? '🚀 როგორ ჩავრთოთ Godot-ში:' : '🚀 How to run in Godot:'}
                </p>
                <p>1. {language === 'ka' ? 'გადმოწერეთ Godot Engine 4 (godotengine.org-დან)' : 'Download Godot 4 (godotengine.org)'}</p>
                <p>2. {language === 'ka' ? 'ამოაარქივეთ ZIP და Godot-ში დააჭირეთ "Import" -> აირჩიეთ project.godot' : 'Extract ZIP and in Godot click "Import" -> Select project.godot'}</p>
                <p>3. {language === 'ka' ? 'დააჭირეთ F5 (Play) — თამაში ეგრევე გაეშვება!' : 'Press F5 (Play) — game starts instantly!'}</p>
              </div>
            </div>

            {/* Section 2: Mobile APK & Instant Install */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#2E1A11] to-[#3D2516] border-3 border-black shadow-[3px_3px_0px_#000000] mb-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ka' ? 'ტელეფონზე ჩაწერა / APK' : 'Mobile Install / APK'}</span>
                </span>
                <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 border border-amber-400/40">
                  Android & iOS
                </span>
              </div>

              {/* Method A */}
              <div className="mb-2.5 pb-2.5 border-b border-black/40">
                <p className="text-xs font-black text-[#FEF08A] mb-1">
                  {language === 'ka' ? '📱 მეთოდი 1: 1 წამში ტელეფონზე დაყენება (PWA)' : '📱 Method 1: Instant Mobile Install (PWA)'}
                </p>
                <p className="text-[11px] text-amber-100/80 leading-relaxed">
                  {language === 'ka'
                    ? 'ტელეფონის ბრაუზერში (Chrome) დააჭირეთ მენიუს (⋮) -> "Install App / მთავარ ეკრანზე დამატება". თამაში ჩაიწერება ტელეფონის აპლიკაციებში, სრული ეკრანითა და 60 კადრით.'
                    : 'In your mobile browser (Chrome/Safari), tap menu (⋮) -> "Add to Home Screen / Install App". Runs fullscreen like a native app!'}
                </p>
              </div>

              {/* Method B */}
              <div>
                <p className="text-xs font-black text-[#FEF08A] mb-1">
                  {language === 'ka' ? '🤖 მეთოდი 2: Godot-იდან APK-ს ექსპორტი' : '🤖 Method 2: Export APK from Godot'}
                </p>
                <p className="text-[11px] text-amber-100/80 leading-relaxed">
                  {language === 'ka'
                    ? 'გახსენით პროექტი Godot-ში -> შედით მენიუში Project -> Export -> Android -> დააჭირეთ "Export Project..." და მიიღებთ სუფთა KoteRunner.apk ფაილს!'
                    : 'Open in Godot -> Go to Project -> Export -> Android -> Click "Export Project..." to generate KoteRunner.apk!'}
                </p>
              </div>
            </div>

            {/* Back CTA */}
            <button
              onClick={() => {
                playClickSound();
                setActiveModal('NONE');
              }}
              className="w-full py-2.5 bg-[#42220D] hover:bg-[#5E3214] text-amber-200 font-mono font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer uppercase"
            >
              {language === 'ka' ? 'დახურვა და თამაშში დაბრუნება' : 'Close & Return'}
            </button>
          </div>
        </div>
      )}

      {/* ================= PAUSE MODAL (WITH MENU RETURN & PIXEL BUTTONS) ================= */}
      {status === 'PAUSED' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none font-mono">
          <div className="max-w-sm w-full bg-gradient-to-b from-[#3D2516] to-[#1C0E07] border-4 border-black rounded-none p-6 text-center shadow-[6px_6px_0px_#000000]">
            <h2 className="text-2xl font-black text-[#FDE68A] mb-1 uppercase tracking-wider">{t.paused}</h2>
            <p className="text-xs text-amber-200/70 mb-5">
              {levelName} · {stats.distance}{t.meters}
            </p>

            <div className="flex flex-col gap-3">
              {/* Resume Button */}
              <button
                onClick={() => {
                  playClickSound();
                  onResume();
                }}
                className="w-full py-3.5 px-4 bg-[#F59E0B] hover:bg-[#FBBF24] active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-mono font-black text-base border-4 border-black shadow-[4px_4px_0px_#000000] rounded-none flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{t.resume}</span>
              </button>

              {/* Restart Button */}
              <button
                onClick={() => {
                  playClickSound();
                  onStart();
                }}
                className="w-full py-3 px-4 bg-[#0284C7] hover:bg-[#38BDF8] active:translate-x-1 active:translate-y-1 active:shadow-none text-white font-mono font-black text-sm border-4 border-black shadow-[4px_4px_0px_#000000] rounded-none flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.playAgain}</span>
              </button>

              {/* Godot / APK Export Button */}
              <button
                onClick={() => {
                  playClickSound();
                  setActiveModal('GODOT_EXPORT');
                }}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-700 to-indigo-800 hover:from-indigo-600 hover:to-indigo-700 active:translate-x-1 active:translate-y-1 active:shadow-none text-indigo-100 font-mono font-black text-xs border-4 border-black shadow-[4px_4px_0px_#000000] rounded-none flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Package className="w-4 h-4 text-indigo-300" />
                <span>📦 Godot / 📱 APK</span>
              </button>

              {/* Main Menu Button (Requested by user!) */}
              <button
                onClick={() => {
                  playClickSound();
                  onGoToMenu();
                }}
                className="w-full py-3 px-4 bg-[#78350F] hover:bg-[#92400E] active:translate-x-1 active:translate-y-1 active:shadow-none text-amber-200 font-mono font-black text-sm border-4 border-black shadow-[4px_4px_0px_#000000] rounded-none flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Home className="w-4 h-4" />
                <span>{t.mainMenu}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= GAME OVER MODAL (WITH MENU RETURN & PIXEL BUTTONS) ================= */}
      {status === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none font-mono">
          <div className="max-w-md w-full bg-gradient-to-b from-[#421712] via-[#2B0E0A] to-[#1A0806] border-4 border-black rounded-none p-6 sm:p-7 text-center shadow-[6px_6px_0px_#000000] relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Chaser portrait */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-none overflow-hidden border-4 border-black shadow-[4px_4px_0px_#000000] bg-black">
              <img
                src="/assets/aistudio/____________b3632765.png"
                alt="Chaser"
                className="w-full h-full object-cover object-top scale-150 translate-y-2"
                referrerPolicy="no-referrer"
              />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-red-400 mb-1 uppercase tracking-wider">
              {t.gameOver}
            </h2>
            <p className="text-xs text-red-200/90 mb-5 max-w-xs mx-auto font-bold">
              {t.gameOverDesc}
            </p>

            {/* Run Stats Grid with Pixel Borders */}
            <div className="grid grid-cols-3 gap-2 mb-5 p-3 bg-[#170605] border-3 border-black shadow-[3px_3px_0px_#000000] text-left">
              <div>
                <span className="text-[10px] uppercase font-bold text-red-300/70">{t.score}</span>
                <p className="text-base sm:text-lg font-black text-amber-300 tabular-nums">
                  {stats.score}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-red-300/70">{t.distance}</span>
                <p className="text-base sm:text-lg font-black text-sky-300 tabular-nums">
                  {stats.distance}{t.meters}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-red-300/70">{t.coins}</span>
                <p className="text-base sm:text-lg font-black text-yellow-300 tabular-nums flex items-center gap-1">
                  <span>{stats.coins}</span>
                  <span className="text-sm">🧻</span>
                </p>
              </div>
            </div>

            {/* Action Buttons: Play Again, Skin Shop & Main Menu */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  playClickSound();
                  onStart();
                }}
                className="w-full py-3.5 px-6 bg-[#F59E0B] hover:bg-[#FBBF24] active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-mono font-black text-base border-4 border-black shadow-[4px_4px_0px_#000000] rounded-none flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{t.playAgain}</span>
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setActiveModal('CHARACTER_SELECT');
                }}
                className="w-full py-2.5 px-6 bg-[#3B124D] hover:bg-[#4E1866] active:translate-x-1 active:translate-y-1 active:shadow-none text-purple-200 font-mono font-black text-xs border-4 border-black shadow-[4px_4px_0px_#000000] rounded-none flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <span>👗</span>
                <span>{language === 'ka' ? 'კოტეს სკინების მაღაზია' : "Kote's Skin Shop"}</span>
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  onGoToMenu();
                }}
                className="w-full py-3 px-6 bg-[#78350F] hover:bg-[#92400E] active:translate-x-1 active:translate-y-1 active:shadow-none text-amber-200 font-mono font-black text-sm border-4 border-black shadow-[4px_4px_0px_#000000] rounded-none flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Home className="w-4 h-4" />
                <span>{t.mainMenu}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
