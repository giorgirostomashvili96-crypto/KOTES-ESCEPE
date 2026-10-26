import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import { loadGameSprites } from '../utils/spriteLoader';
import { soundEngine } from '../audio/soundEngine';
import { GameStatus, GameStats, ActivePowerUp, Language, CharacterSkin } from '../types/game';
import { GameUI } from './GameUI';
import { TouchControls } from './TouchControls';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [status, setStatus] = useState<GameStatus>('TITLE');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    coins: 0,
    distance: 0,
    level: 1,
    dogDistance: 220,
    multiplier: 1,
    combo: 0,
    highScore: 0,
    highDistance: 0,
  });
  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUp[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('ka');
  const [selectedSkin, setSelectedSkin] = useState<CharacterSkin>('classic');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Swipe gesture tracking
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Throttled stats sync from engine to React
  const handleStatsUpdate = useCallback(
    (newStats: GameStats, powerUps: ActivePowerUp[], newStatus: GameStatus) => {
      setStats(newStats);
      setActivePowerUps(powerUps);
      setStatus(newStatus);
    },
    []
  );

  // Initialize engine and load sprite assets
  useEffect(() => {
    let isCancelled = false;

    async function init() {
      try {
        await loadGameSprites();
      } catch (e) {
        console.warn('Fallback to procedural assets', e);
      }

      if (isCancelled || !canvasRef.current) return;

      const engine = new GameEngine(canvasRef.current, handleStatsUpdate);
      engineRef.current = engine;

      // Initial canvas sizing
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        engine.resize(rect.width || 1280, rect.height || 720);
      }

      setIsLoading(false);
    }

    init();

    return () => {
      isCancelled = true;
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, [handleStatsUpdate]);

  // Handle ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && engineRef.current) {
          engineRef.current.resize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS'].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }
      if (engineRef.current) {
        engineRef.current.onKeyDown(e.code);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (engineRef.current) {
        engineRef.current.onKeyUp(e.code);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Canvas Swipe / Tap Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartPos.current || !engineRef.current) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartPos.current.x;
    const endY = e.changedTouches[0]?.clientY ?? touchStartPos.current.y;
    const dy = endY - touchStartPos.current.y;
    const dx = endX - touchStartPos.current.x;

    // Check if swipe or tap
    if (Math.abs(dy) > 35 && Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) {
        // Swipe Up -> Jump
        engineRef.current.handleJumpPress();
      } else {
        // Swipe Down -> Slide
        engineRef.current.handleSlidePress();
      }
    } else if (Math.abs(dy) < 15 && Math.abs(dx) < 15) {
      // Tap on canvas -> Jump
      engineRef.current.handleJumpPress();
    }

    touchStartPos.current = null;
  };

  // Actions
  const handleStart = (level: number = 1) => {
    if (engineRef.current) {
      engineRef.current.start(level, selectedSkin);
      setStatus('PLAYING');
    }
  };

  const handleResume = () => {
    if (engineRef.current) {
      engineRef.current.resume();
      setStatus('PLAYING');
    }
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.pause();
      setStatus('PAUSED');
    }
  };

  const handleGoToMenu = () => {
    if (engineRef.current) {
      engineRef.current.goToMenu();
    }
    setStatus('TITLE');
  };

  const handleToggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'ka' ? 'en' : 'ka'));
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  const hasBone = activePowerUps.some((p) => p.type === 'bone');

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none touch-none flex items-center justify-center"
    >
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wider">იტვირთება... / Loading Assets...</span>
        </div>
      )}

      {/* 60fps Game Canvas */}
      <canvas
        ref={canvasRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="block w-full h-full object-contain cursor-pointer"
      />

      {/* HUD & Modals */}
      <GameUI
        status={status}
        stats={stats}
        activePowerUps={activePowerUps}
        language={language}
        isMuted={isMuted}
        selectedSkin={selectedSkin}
        onSelectSkin={setSelectedSkin}
        onStart={handleStart}
        onResume={handleResume}
        onPause={handlePause}
        onGoToMenu={handleGoToMenu}
        onToggleSound={handleToggleSound}
        onToggleLanguage={handleToggleLanguage}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* On-screen touch controls for mobile (only during gameplay) */}
      {status === 'PLAYING' && (
        <TouchControls
          onJump={() => engineRef.current?.handleJumpPress()}
          onSlide={() => engineRef.current?.handleSlidePress()}
          onBoost={() => engineRef.current?.handleBoostPress()}
          hasBone={hasBone}
          language={language}
        />
      )}
    </div>
  );
};
