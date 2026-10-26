export type GameStatus = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type Language = 'ka' | 'en';

export type CharacterSkin =
  | 'classic'
  | 'new_year'
  | 'halloween'
  | 'summer'
  | 'chokha'
  | 'cyberpunk'
  | 'taxi'
  | 'svaneti'
  | 'vip';

export interface CharacterConfig {
  id: CharacterSkin;
  nameKa: string;
  nameEn: string;
  titleKa: string;
  price: number;
  speedBonus: number;
  jumpBonus: number;
  shieldBonus: boolean;
  descriptionKa: string;
  badgeEmoji: string;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  baseWidth: number;
  baseHeight: number;
  isGrounded: boolean;
  isJumping: boolean;
  jumpCount: number;
  maxJumps: number;
  isSliding: boolean;
  slideTimer: number;
  slideFrameTimer: number;
  currentSlideFrame: number;
  invincibleTimer: number;
  stumbleTimer: number;
  runFrameTimer: number;
  currentFrame: number;
}

export interface ChasingDog {
  x: number; // distance from player behind
  targetX: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  frameTimer: number;
  currentFrame: number;
  isBarking: boolean;
  barkTimer: number;
  angerLevel: number; // 0 to 1
  shoutText?: string;
  isSlipped?: boolean;
  slipTimer?: number;
  throwCooldown?: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  radius: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface UpgradesState {
  magnetTier: number;
  speedTier: number;
  shieldTier: number;
  trapsCount: number;
}

export type ObstacleType =
  | 'barrel'
  | 'hay_bale'
  | 'stone_rock'
  | 'wooden_fence'
  | 'low_beam'
  | 'crate'
  | 'flying_toilet';

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  passed: boolean;
  requiresSlide: boolean; // if true, must slide under
}

export interface Platform {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'rooftop' | 'bridge';
}

export interface SpringPad {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spring' | 'trampoline';
  bounceForce: number;
  isCompressed: boolean;
  compressTimer: number;
}

export type PowerUpType = 'magnet' | 'speed' | 'bone' | 'shield';

export interface Collectible {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'coin' | PowerUpType;
  value: number;
  collected: boolean;
  animTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'smoke' | 'shockwave' | 'bark';
}

export interface ActivePowerUp {
  type: PowerUpType;
  remaining: number;
  duration: number;
}

export interface LevelConfig {
  levelNumber: number;
  nameKa: string;
  nameEn: string;
  speed: number;
  targetDistance: number;
  bgColor: string;
  skyFilter: string;
  obstacleRate: number;
  dogCatchUpSpeed: number;
}

export interface GameStats {
  score: number;
  coins: number;
  distance: number;
  level: number;
  dogDistance: number; // in pixels (0 = caught, 200 = normal safe)
  multiplier: number;
  combo: number;
  highScore: number;
  highDistance: number;
  feverTimer?: number;
  feverStreak?: number;
  nearMissCount?: number;
}
