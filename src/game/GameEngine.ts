import {
  Player,
  ChasingDog,
  Obstacle,
  ObstacleType,
  Platform,
  SpringPad,
  Collectible,
  Particle,
  ActivePowerUp,
  GameStatus,
  GameStats,
  PowerUpType,
  CharacterSkin,
  Projectile,
  FloatingText,
  UpgradesState,
} from '../types/game';
import { LEVEL_CONFIGS } from '../utils/gameData';
import { spriteCache } from '../utils/spriteLoader';
import { soundEngine } from '../audio/soundEngine';

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  public status: GameStatus = 'TITLE';
  public width: number = 1280;
  public height: number = 720;
  public selectedSkin: CharacterSkin = 'classic';

  // Simulation parameters
  private readonly GRAVITY = 2100;
  private readonly JUMP_FORCE = -850;
  private readonly DOUBLE_JUMP_FORCE = -750;
  public groundY: number = 540;
  private get BASE_GROUND_Y(): number {
    return this.groundY;
  }

  public player: Player;
  public dog: ChasingDog;
  public platforms: Platform[] = [];
  public springPads: SpringPad[] = [];
  public obstacles: Obstacle[] = [];
  public collectibles: Collectible[] = [];
  public particles: Particle[] = [];
  public projectiles: Projectile[] = [];
  public floatingTexts: FloatingText[] = [];
  public activePowerUps: Map<PowerUpType, ActivePowerUp> = new Map();

  // Weather atmosphere particles
  private weatherParticles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    rotSpeed: number;
    type: 'leaf' | 'firefly' | 'rain' | 'spark';
  }> = [];

  // Difficulty & Progression
  public currentLevelIndex: number = 0;
  public stats: GameStats;
  public upgrades: UpgradesState = {
    magnetTier: 0,
    speedTier: 0,
    shieldTier: 0,
    trapsCount: 2,
  };

  // Special juice timers
  private hitstopTimer: number = 0;
  private feverStreak: number = 0;
  private thunderTimer: number = 0;
  private chaserThrowTimer: number = 6.0;
  private chaserTelegraphTimer: number = 0;

  // Parallax offsets
  private skyOffset: number = 0;
  private cityOffset: number = 0;
  private midOffset: number = 0;
  private groundOffset: number = 0;

  // Generator timers
  private nextObstacleDistance: number = 300;
  private nextCollectibleDistance: number = 200;
  private nextPlatformDistance: number = 700;
  private nextSpringDistance: number = 450;
  private obstacleIdCounter: number = 0;
  private lastTimestamp: number = 0;

  // Animation frame
  private animFrameId: number | null = null;
  private isRunning: boolean = false;

  // Screen Shake & Flash
  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;
  private flashTimer: number = 0;
  private flashColor: string = 'rgba(255, 0, 0, 0.3)';

  // Input state
  private inputHeld = {
    jump: false,
    slide: false,
    boost: false,
  };
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;

  // Dog sound timer
  private dogBarkCooldown: number = 3.5;
  private heartbeatCooldown: number = 0.8;

  // Callbacks for React state sync (throttled to 10Hz to prevent React re-renders)
  private onStatsUpdate?: (stats: GameStats, powerUps: ActivePowerUp[], status: GameStatus) => void;
  private lastStatsSyncTime: number = 0;

  constructor(canvas: HTMLCanvasElement, onStatsUpdate?: (stats: GameStats, powerUps: ActivePowerUp[], status: GameStatus) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.onStatsUpdate = onStatsUpdate;

    this.player = this.createDefaultPlayer();
    this.dog = this.createDefaultDog();
    this.stats = this.createDefaultStats();

    this.initWorld();
  }

  private createDefaultPlayer(): Player {
    const targetX = Math.max(100, Math.min(360, Math.round(this.width * 0.25)));
    return {
      x: targetX,
      y: this.groundY - 120,
      vx: 0,
      vy: 0,
      width: 72,
      height: 120,
      baseWidth: 72,
      baseHeight: 120,
      isGrounded: true,
      isJumping: false,
      jumpCount: 0,
      maxJumps: 2,
      isSliding: false,
      slideTimer: 0,
      slideFrameTimer: 0,
      currentSlideFrame: 0,
      invincibleTimer: 0,
      stumbleTimer: 0,
      runFrameTimer: 0,
      currentFrame: 0,
    };
  }

  private createDefaultDog(): ChasingDog {
    const playerX = Math.max(100, Math.min(360, Math.round(this.width * 0.25)));
    return {
      x: Math.max(20, playerX - 200),
      targetX: Math.max(20, playerX - 200),
      y: this.groundY - 120,
      width: 72,
      height: 120,
      speed: 300,
      frameTimer: 0,
      currentFrame: 0,
      isBarking: false,
      barkTimer: 0,
      angerLevel: 0.1,
      shoutText: 'გისმენ ბინძურო!',
      isSlipped: false,
      slipTimer: 0,
      throwCooldown: 6.0,
    };
  }

  private createDefaultStats(): GameStats {
    const savedHighScore = localStorage.getItem('pixel_runner_highscore');
    const savedHighDist = localStorage.getItem('pixel_runner_highdist');
    const savedCoins = localStorage.getItem('pixel_runner_coins');
    const initialCoins = savedCoins !== null ? parseInt(savedCoins, 10) : 100;
    return {
      score: 0,
      coins: initialCoins,
      distance: 0,
      level: 1,
      dogDistance: 220,
      multiplier: 1,
      combo: 0,
      highScore: savedHighScore ? parseInt(savedHighScore, 10) : 0,
      highDistance: savedHighDist ? parseInt(savedHighDist, 10) : 0,
      feverTimer: 0,
      feverStreak: 0,
      nearMissCount: 0,
    };
  }

  public getCoins(): number {
    return this.stats.coins;
  }

  public setCoins(amount: number) {
    this.stats.coins = Math.max(0, amount);
    localStorage.setItem('pixel_runner_coins', this.stats.coins.toString());
    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats }, Array.from(this.activePowerUps.values()), this.status);
    }
  }

  public initWorld() {
    this.groundY = Math.max(260, Math.round(this.height * 0.76));
    this.platforms = [
      { id: 1, x: 0, y: this.groundY, width: Math.max(3000, this.width * 3), height: 400, type: 'ground' },
    ];
    this.springPads = [];
    this.nextSpringDistance = 450;
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.projectiles = [];
    this.floatingTexts = [];
    this.activePowerUps.clear();
    this.initWeather();
  }

  public initWeather() {
    this.weatherParticles = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: -(Math.random() * 140 + 70),
        vy: Math.random() * 70 + 20,
        size: Math.random() * 5 + 3,
        color: '#F59E0B',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 4,
        type: 'leaf',
      });
    }
  }

  public loadUpgrades() {
    try {
      const saved = localStorage.getItem('kote_upgrades');
      if (saved) {
        this.upgrades = { ...this.upgrades, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    const oldGroundY = this.groundY;
    this.groundY = Math.max(260, Math.round(this.height * 0.76));
    const dy = this.groundY - oldGroundY;

    // Shift platforms to match new ground height
    for (const plat of this.platforms) {
      if (plat.type === 'ground') {
        plat.y = this.groundY;
        plat.height = Math.max(250, this.height - this.groundY + 100);
      } else {
        plat.y += dy;
      }
    }

    // Shift spring pads
    for (const sp of this.springPads) {
      sp.y += dy;
    }

    // Adapt player position to screen size
    this.player.x = Math.max(100, Math.min(360, Math.round(this.width * 0.25)));
    if (this.player.isGrounded) {
      this.player.y = this.groundY - this.player.height;
    }
    this.dog.x = Math.max(20, this.player.x - this.stats.dogDistance);
    this.dog.y = this.groundY - this.dog.height;
  }

  public start(startingLevel: number = 1, skin: CharacterSkin = 'classic') {
    this.status = 'PLAYING';
    this.selectedSkin = skin;
    this.currentLevelIndex = Math.max(0, Math.min(LEVEL_CONFIGS.length - 1, startingLevel - 1));
    this.groundY = Math.max(260, Math.round(this.height * 0.76));
    this.player = this.createDefaultPlayer();
    this.dog = this.createDefaultDog();
    this.loadUpgrades();

    // Skin bonuses
    if (skin === 'cyberpunk') {
      this.player.maxJumps = 3; // Triple jump for Cyberpunk 2099!
    } else {
      this.player.maxJumps = 2;
    }

    const startDist = this.currentLevelIndex === 0 ? 0 : (LEVEL_CONFIGS[this.currentLevelIndex - 1]?.targetDistance || 0) + 10;
    const currentCoins = this.stats ? this.stats.coins : (parseInt(localStorage.getItem('pixel_runner_coins') || '100', 10));
    this.stats = {
      ...this.createDefaultStats(),
      coins: currentCoins,
      level: this.currentLevelIndex + 1,
      multiplier: this.currentLevelIndex + 1,
      distance: startDist,
      dogDistance: skin === 'halloween' ? 260 : 220, // Halloween grants +40px head start!
      highScore: this.stats.highScore,
      highDistance: this.stats.highDistance,
    };

    this.initWorld();

    if (skin === 'svaneti' || this.upgrades.shieldTier > 0) {
      // Svaneti Alpinist or Shield upgrade grants starting protective barrier!
      const dur = 20 + this.upgrades.shieldTier * 8;
      this.activePowerUps.set('shield', {
        type: 'shield',
        duration: dur,
        remaining: dur,
      });
    }

    if (skin === 'summer') {
      // Batumi Summer Speedster: starting sprint boost!
      this.activePowerUps.set('speed', {
        type: 'speed',
        duration: 12,
        remaining: 12,
      });
    }

    if (skin === 'taxi') {
      // Tbilisi Taxi starts with dog distraction bone treat!
      this.activePowerUps.set('bone', {
        type: 'bone',
        duration: 999,
        remaining: 999,
      });
    }

    soundEngine.startMusic(1.0 + this.currentLevelIndex * 0.12);
    soundEngine.speak('გაიქეცი, კოტე!');

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTimestamp = performance.now();
      this.loop(this.lastTimestamp);
    }
  }

  public resume() {
    if (this.status === 'PAUSED') {
      this.status = 'PLAYING';
      this.lastTimestamp = performance.now();
      soundEngine.startMusic(1.0 + this.currentLevelIndex * 0.12);
    }
  }

  public pause() {
    if (this.status === 'PLAYING') {
      this.status = 'PAUSED';
      soundEngine.stopMusic();
    }
  }

  public stop() {
    this.isRunning = false;
    soundEngine.stopMusic();
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public goToMenu() {
    this.status = 'TITLE';
    this.stop();
    if (this.onStatsUpdate) {
      this.onStatsUpdate(
        { ...this.stats },
        Array.from(this.activePowerUps.values()),
        'TITLE'
      );
    }
  }

  // Input Handlers
  public onKeyDown(code: string) {
    if (this.status !== 'PLAYING') {
      if (code === 'Space' || code === 'Enter') {
        if (this.status === 'TITLE' || this.status === 'GAMEOVER') {
          this.start();
        } else if (this.status === 'PAUSED') {
          this.resume();
        }
      }
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      this.pause();
      return;
    }

    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      this.inputHeld.jump = true;
      this.handleJumpPress();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.inputHeld.slide = true;
      this.handleSlidePress();
    } else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE') {
      this.handleBoostPress();
    } else if (code === 'KeyB') {
      this.deployBananaTrap();
    }
  }

  public onKeyUp(code: string) {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      this.inputHeld.jump = false;
      // Variable jump height: release early to cut jump short
      if (this.player.vy < -300) {
        this.player.vy *= 0.5;
      }
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.inputHeld.slide = false;
    }
  }

  // Touch & Mobile actions
  public handleJumpPress() {
    if (this.status !== 'PLAYING') {
      this.start();
      return;
    }

    this.jumpBufferTimer = 0.14; // buffer jump

    if (this.player.isGrounded || this.coyoteTimer > 0) {
      this.performJump(false);
    } else if (this.player.jumpCount < this.player.maxJumps) {
      this.performJump(true);
    }
  }

  public handleSlidePress() {
    if (this.status !== 'PLAYING') return;

    if (this.player.isGrounded && !this.player.isSliding) {
      this.player.isSliding = true;
      this.player.slideTimer = 0.72;
      this.player.slideFrameTimer = 0;
      this.player.currentSlideFrame = 0;
      this.player.height = this.player.baseHeight * 0.48;
      this.player.y += this.player.baseHeight * 0.52;
      soundEngine.playSlide();

      // Emit slide friction sparks
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: this.player.x + 10,
          y: this.player.y + this.player.height,
          vx: -(Math.random() * 250 + 100),
          vy: -(Math.random() * 120 + 30),
          size: Math.random() * 4 + 2,
          color: Math.random() > 0.4 ? '#F59E0B' : '#EF4444',
          alpha: 1,
          life: 0,
          maxLife: 0.35,
          shape: 'spark',
        });
      }
    }
  }

  public handleBoostPress() {
    if (this.status !== 'PLAYING') return;
    const bone = this.activePowerUps.get('bone');
    if (bone) {
      this.distractDogWithBone();
    } else if (this.upgrades.trapsCount > 0) {
      this.deployBananaTrap();
    } else {
      // Dash burst
      soundEngine.playSlide();
      this.spawnFloatingText('⚡ სისწრაფე!', this.player.x, this.player.y - 20, '#38BDF8');
      this.dog.x = Math.max(20, this.dog.x - 35);
    }
  }

  public deployBananaTrap() {
    if (this.upgrades.trapsCount <= 0) return;
    this.upgrades.trapsCount--;
    try {
      localStorage.setItem('kote_upgrades', JSON.stringify(this.upgrades));
    } catch {}

    soundEngine.playSlide();
    this.spawnFloatingText('🍌 ხაფანგი!', this.player.x, this.player.y - 20, '#FEF08A');

    // Spawn spinning banana trap on the track
    this.projectiles.push({
      id: ++this.obstacleIdCounter,
      x: this.player.x - 25,
      y: this.BASE_GROUND_Y - 26,
      vx: -130, // slides backward toward chaser
      vy: 0,
      rotation: 0,
      radius: 16,
    });
  }

  public spawnFloatingText(text: string, x: number, y: number, color: string = '#FEF08A') {
    this.floatingTexts.push({
      id: ++this.obstacleIdCounter,
      text,
      x,
      y,
      color,
      life: 0,
      maxLife: 1.1,
    });
  }

  public triggerNearMiss(x: number, y: number) {
    this.hitstopTimer = 0.12; // Matrix micro slow-mo
    soundEngine.playNearMiss();
    this.stats.score += 75 * this.stats.multiplier;
    this.stats.nearMissCount = (this.stats.nearMissCount || 0) + 1;
    this.spawnFloatingText('კინაღამ! +75', x, y - 30, '#38BDF8');

    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 240,
        vy: (Math.random() - 0.5) * 160,
        size: Math.random() * 4 + 2,
        color: '#06B6D4',
        alpha: 1,
        life: 0,
        maxLife: 0.35,
        shape: 'spark',
      });
    }
  }

  private performJump(isDouble: boolean) {
    if (this.player.isSliding) {
      // Cancel slide on jump
      this.player.isSliding = false;
      this.player.slideTimer = 0;
      this.player.slideFrameTimer = 0;
      this.player.currentSlideFrame = 0;
      this.player.height = this.player.baseHeight;
      this.player.y -= this.player.baseHeight * 0.52;
    }

    this.player.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;

    if (isDouble) {
      this.player.vy = this.DOUBLE_JUMP_FORCE;
      this.player.jumpCount = 2;
      soundEngine.playDoubleJump();

      // Air burst particles
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: this.player.x + this.player.width / 2,
          y: this.player.y + this.player.height,
          vx: (Math.random() - 0.5) * 200,
          vy: Math.random() * 100 + 40,
          size: Math.random() * 5 + 3,
          color: '#38BDF8',
          alpha: 1,
          life: 0,
          maxLife: 0.3,
          shape: 'circle',
        });
      }
    } else {
      this.player.vy = this.JUMP_FORCE;
      this.player.jumpCount = 1;
      soundEngine.playJump();

      // Jump dust puffs
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: this.player.x + (Math.random() * this.player.width),
          y: this.player.y + this.player.height,
          vx: -(Math.random() * 100 + 50),
          vy: -(Math.random() * 60 + 10),
          size: Math.random() * 6 + 3,
          color: '#94A3B8',
          alpha: 0.8,
          life: 0,
          maxLife: 0.4,
          shape: 'smoke',
        });
      }
    }
  }

  private distractDogWithBone() {
    this.activePowerUps.delete('bone');
    soundEngine.playPowerUp();

    // Spawn flying bone backwards towards dog
    this.particles.push({
      x: this.player.x,
      y: this.player.y + 40,
      vx: -400,
      vy: -150,
      size: 24,
      color: '#FFFFFF',
      alpha: 1,
      life: 0,
      maxLife: 1.0,
      shape: 'spark',
    });

    // Push dog back safely
    this.dog.x = Math.max(30, this.dog.x - 140);
    this.stats.dogDistance = this.player.x - this.dog.x;
  }

  // Main Loop
  private loop = (timestamp: number) => {
    if (!this.isRunning) return;

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    let dt = Math.min(rawDt, 0.05);

    // Matrix slow-mo hitstop
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= rawDt;
      dt *= 0.3; // Dramatic slow-mo!
    }

    if (this.status === 'PLAYING') {
      this.update(dt);
    }

    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private getCurrentLevelConfig() {
    return LEVEL_CONFIGS[this.currentLevelIndex] || LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
  }

  private update(dt: number) {
    const levelCfg = this.getCurrentLevelConfig();
    let currentSpeed = levelCfg.speed;

    // Check speed boost powerup
    const speedBoost = this.activePowerUps.get('speed');
    if (speedBoost) {
      currentSpeed *= 1.35;
      // Emit speed trail lines
      if (Math.random() > 0.4) {
        this.particles.push({
          x: this.player.x - 20,
          y: this.player.y + Math.random() * this.player.height,
          vx: -700,
          vy: 0,
          size: Math.random() * 20 + 15,
          color: '#FACC15',
          alpha: 0.9,
          life: 0,
          maxLife: 0.25,
          shape: 'spark',
        });
      }
    }

    // Fever Mode processing
    if (this.stats.feverTimer && this.stats.feverTimer > 0) {
      this.stats.feverTimer -= dt;
      currentSpeed *= 1.25;
      this.stats.multiplier = 3 * (this.currentLevelIndex + 1);

      // Rainbow trail behind Kote
      if (Math.random() > 0.35) {
        this.particles.push({
          x: this.player.x - 10,
          y: this.player.y + Math.random() * this.player.height,
          vx: -240,
          vy: (Math.random() - 0.5) * 40,
          size: Math.random() * 8 + 4,
          color: ['#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6'][Math.floor(Math.random() * 5)],
          alpha: 0.9,
          life: 0,
          maxLife: 0.35,
          shape: 'circle',
        });
      }
    }

    // Advance distance & score
    const frameDistance = currentSpeed * dt;
    this.stats.distance += Math.floor(frameDistance * 0.1);
    this.stats.score += Math.floor(frameDistance * 0.2 * this.stats.multiplier);

    if (this.stats.distance > this.stats.highDistance) {
      this.stats.highDistance = this.stats.distance;
      localStorage.setItem('pixel_runner_highdist', this.stats.highDistance.toString());
    }
    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      localStorage.setItem('pixel_runner_highscore', this.stats.highScore.toString());
    }

    // Check level progression milestones
    if (
      this.currentLevelIndex < LEVEL_CONFIGS.length - 1 &&
      this.stats.distance >= levelCfg.targetDistance
    ) {
      this.currentLevelIndex++;
      this.stats.level = this.currentLevelIndex + 1;
      this.stats.multiplier = this.stats.level;
      soundEngine.playLevelUp();
      soundEngine.setMusicSpeed(1.0 + this.currentLevelIndex * 0.12);

      // Level milestone flash
      this.flashTimer = 0.4;
      this.flashColor = 'rgba(250, 204, 21, 0.35)';

      // Confetti / celebratory sparks
      for (let i = 0; i < 35; i++) {
        this.particles.push({
          x: this.player.x + 100,
          y: 200,
          vx: (Math.random() - 0.5) * 500,
          vy: (Math.random() - 0.7) * 400,
          size: Math.random() * 8 + 4,
          color: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'][i % 5],
          alpha: 1,
          life: 0,
          maxLife: 1.2,
          shape: 'circle',
        });
      }
    }

    // Update Parallax Offsets
    this.skyOffset = (this.skyOffset + currentSpeed * dt * 0.08) % this.width;
    this.cityOffset = (this.cityOffset + currentSpeed * dt * 0.3) % this.width;
    this.midOffset = (this.midOffset + currentSpeed * dt * 0.65) % this.width;
    this.groundOffset = (this.groundOffset + currentSpeed * dt) % 64;

    // Update Player Physics
    this.updatePlayer(dt, currentSpeed);

    // Update Chasing Dog
    this.updateDog(dt, currentSpeed, levelCfg.dogCatchUpSpeed);

    // Update PowerUps
    this.updatePowerUps(dt);

    // Update World (Platforms, Obstacles, Collectibles)
    this.updateWorld(dt, currentSpeed);

    // Update Projectiles & Traps
    this.updateProjectiles(dt, currentSpeed);

    // Update Weather
    this.updateWeather(dt, currentSpeed);

    // Update Floating Texts
    this.updateFloatingTexts(dt);

    // Update Particles
    this.updateParticles(dt);

    // Shake & Flash decay
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    // Sync stats to React UI at 10Hz
    const now = performance.now();
    if (now - this.lastStatsSyncTime > 100) {
      this.lastStatsSyncTime = now;
      if (this.onStatsUpdate) {
        this.onStatsUpdate(
          { ...this.stats },
          Array.from(this.activePowerUps.values()),
          this.status
        );
      }
    }
  }

  private updatePlayer(dt: number, currentSpeed: number) {
    const p = this.player;

    // Stumble recovery
    if (p.stumbleTimer > 0) {
      p.stumbleTimer -= dt;
    }
    if (p.invincibleTimer > 0) {
      p.invincibleTimer -= dt;
    }

    // Slide countdown and somersault/roll animation progression
    if (p.isSliding) {
      p.slideTimer -= dt;
      p.slideFrameTimer += dt * 8.5; // cycling through the roll/crouch frames smoothly
      const slideFrameCount = spriteCache.playerSlideFrames.length > 0 ? spriteCache.playerSlideFrames.length : 6;
      p.currentSlideFrame = Math.min(slideFrameCount - 1, Math.floor(p.slideFrameTimer));

      // Continuous ground friction dust while sliding/rolling
      if (Math.random() > 0.4) {
        this.particles.push({
          x: p.x + 8 + Math.random() * (p.width - 16),
          y: p.y + p.height - 2,
          vx: -(Math.random() * 220 + 70),
          vy: -(Math.random() * 40 + 10),
          size: Math.random() * 4 + 2,
          color: Math.random() > 0.4 ? '#CBD5E1' : '#F59E0B',
          alpha: 0.8,
          life: 0,
          maxLife: 0.28,
          shape: Math.random() > 0.5 ? 'smoke' : 'spark',
        });
      }

      if (p.slideTimer <= 0) {
        p.isSliding = false;
        p.height = p.baseHeight;
        p.y -= p.baseHeight * 0.52;
        p.slideFrameTimer = 0;
        p.currentSlideFrame = 0;
      }
    }

    // Coyote & Buffer timers
    if (!p.isGrounded && this.coyoteTimer > 0) {
      this.coyoteTimer -= dt;
    }
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
    }

    // Gravity
    p.vy += this.GRAVITY * dt;
    p.y += p.vy * dt;

    // Platform collision detection
    let landed = false;
    for (const plat of this.platforms) {
      const platRight = plat.x + plat.width;
      const playerBottom = p.y + p.height;
      const prevBottom = playerBottom - p.vy * dt;

      // Vertical landing condition
      if (
        p.x + p.width * 0.6 > plat.x &&
        p.x + p.width * 0.2 < platRight &&
        prevBottom <= plat.y + 16 &&
        playerBottom >= plat.y
      ) {
        p.y = plat.y - p.height;
        p.vy = 0;
        landed = true;
        if (!p.isGrounded) {
          // Landing sound & dust
          soundEngine.playSlide();
          for (let i = 0; i < 5; i++) {
            this.particles.push({
              x: p.x + p.width * 0.5 + (Math.random() - 0.5) * 30,
              y: p.y + p.height,
              vx: (Math.random() - 0.5) * 120,
              vy: -Math.random() * 40,
              size: Math.random() * 4 + 2,
              color: '#CBD5E1',
              alpha: 0.8,
              life: 0,
              maxLife: 0.3,
              shape: 'smoke',
            });
          }
        }
        p.isGrounded = true;
        p.jumpCount = 0;
        break;
      }
    }

    if (!landed) {
      p.isGrounded = false;
    }

    // Pitfall check (fell into gap between platforms)
    if (p.y > this.height + 100) {
      this.triggerGameOver('ძაღლმა დაგიჭირა ან ჩავარდი!');
      return;
    }

    // Animation frame cycling
    if (p.isGrounded) {
      p.runFrameTimer += dt * (currentSpeed / 240) * 12;
      p.currentFrame = Math.floor(p.runFrameTimer) % 6; // 6 running frames
    }
  }

  private updateDog(dt: number, currentSpeed: number, catchUpSpeed: number) {
    const dog = this.dog;

    // Telegraph countdown
    if (this.chaserTelegraphTimer > 0) {
      this.chaserTelegraphTimer -= dt;
    }

    // Slip state (Banana trap effect)
    if (dog.isSlipped) {
      if (dog.slipTimer) {
        dog.slipTimer -= dt;
        if (dog.slipTimer <= 0) {
          dog.isSlipped = false;
        }
      }
      // Chaser cannot advance while slipping
      dog.x -= catchUpSpeed * 0.6 * dt;
    } else {
      // Normal safe distance from player: 220px behind player
      const desiredDogDistance = 220 - (this.currentLevelIndex * 20);

      if (this.player.stumbleTimer > 0) {
        dog.x += (catchUpSpeed * 2.8) * dt;
      } else {
        const currentDist = this.player.x - dog.x;
        if (currentDist < desiredDogDistance) {
          dog.x -= catchUpSpeed * 0.4 * dt;
        } else if (currentDist > desiredDogDistance + 40) {
          dog.x += catchUpSpeed * 0.7 * dt;
        }
      }

      // Chaser projectile throwing attack on Level 2+
      if (this.currentLevelIndex >= 1) {
        this.chaserThrowTimer -= dt;
        if (this.chaserThrowTimer <= 0.65 && this.chaserTelegraphTimer <= 0) {
          this.chaserTelegraphTimer = 0.65;
        }
        if (this.chaserThrowTimer <= 0) {
          this.chaserThrowTimer = Math.random() * 5.0 + 7.0;
          this.chaserTelegraphTimer = 0;
          this.projectiles.push({
            id: ++this.obstacleIdCounter,
            x: dog.x + dog.width,
            y: dog.y + 35,
            vx: 520,
            vy: -140,
            rotation: 0,
            radius: 14,
          });
          soundEngine.playSlide();
          dog.shoutText = 'აჰა ესეც შენ!';
          dog.isBarking = true;
          dog.barkTimer = 0.85;
        }
      }
    }

    // Keep dog on screen
    dog.x = Math.max(20, dog.x);
    this.stats.dogDistance = Math.max(0, Math.floor(this.player.x - dog.x));

    // Align chaser Y with current platform ground
    const chaserPlat = this.platforms.find(p => p.x <= dog.x + 40 && p.x + p.width >= dog.x);
    const groundY = chaserPlat ? chaserPlat.y : this.BASE_GROUND_Y;
    dog.y = groundY - dog.height;

    // Chaser caught player check!
    if (this.stats.dogDistance <= 25 && !dog.isSlipped) {
      this.triggerGameOver('მდევარმა დაგიჭირა!');
      return;
    }

    // Shout timer & audio cues
    this.dogBarkCooldown -= dt;
    if (this.dogBarkCooldown <= 0 && !dog.isSlipped) {
      this.dogBarkCooldown = Math.random() * 3.2 + 2.4;
      dog.isBarking = true;
      dog.barkTimer = 1.6;
      const shouts = [
        'გისმენ ბინძურო!',
        'ვერსად გამექცევი ბინძურო!',
        'გისმენ ბინძურ!',
        'ვერსად გამექცევი ბინძურ!',
        'ტუალეტის ქაღალდი დააბრუნე, ბინძურო!',
        'მაინც დაგიჭერ, ბინძურო!',
      ];
      dog.shoutText = shouts[Math.floor(Math.random() * shouts.length)];
      soundEngine.playChaserShout();
      soundEngine.speak(dog.shoutText);

      this.particles.push({
        x: dog.x + dog.width * 0.85,
        y: dog.y + 30,
        vx: 300,
        vy: -20,
        size: 16,
        color: '#EF4444',
        alpha: 0.9,
        life: 0,
        maxLife: 0.45,
        shape: 'bark',
      });
    }

    if (dog.barkTimer > 0) {
      dog.barkTimer -= dt;
      if (dog.barkTimer <= 0) {
        dog.isBarking = false;
      }
    }

    // Proximity alert: when chaser is dangerously close (< 100px)
    if (this.stats.dogDistance < 100 && !dog.isSlipped) {
      this.heartbeatCooldown -= dt;
      if (this.heartbeatCooldown <= 0) {
        this.heartbeatCooldown = Math.max(0.25, (this.stats.dogDistance / 100) * 0.6);
        soundEngine.playHeartbeat();
      }
    }

    // Chaser run animation cycle (4 frames)
    if (!dog.isSlipped) {
      dog.frameTimer += dt * (currentSpeed / 200) * 12;
      const numFrames = spriteCache.dogFrames.length || 4;
      dog.currentFrame = Math.floor(dog.frameTimer) % numFrames;
    }
  }

  private updatePowerUps(dt: number) {
    for (const [type, pUp] of this.activePowerUps.entries()) {
      pUp.remaining -= dt;
      if (pUp.remaining <= 0) {
        this.activePowerUps.delete(type);
      }
    }
  }

  private updateWorld(dt: number, currentSpeed: number) {
    const shift = currentSpeed * dt;

    // 1. Move Platforms
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const plat = this.platforms[i];
      plat.x -= shift;

      if (plat.x + plat.width < -100) {
        this.platforms.splice(i, 1);
      }
    }

    // Spawn new platforms
    const lastPlatform = this.platforms[this.platforms.length - 1];
    if (lastPlatform && lastPlatform.x + lastPlatform.width < this.width + 500) {
      const isRooftopGap = Math.random() < 0.25 + (this.currentLevelIndex * 0.05);
      const gapWidth = isRooftopGap ? Math.random() * 120 + 90 : 0;
      const newX = lastPlatform.x + lastPlatform.width + gapWidth;
      const platWidth = Math.random() * 600 + 800;

      let platY = this.BASE_GROUND_Y;
      if (isRooftopGap && Math.random() > 0.4) {
        platY = this.BASE_GROUND_Y - (Math.random() * 90 + 50);
      }

      this.platforms.push({
        id: ++this.obstacleIdCounter,
        x: newX,
        y: platY,
        width: platWidth,
        height: 200,
        type: isRooftopGap ? 'rooftop' : 'ground',
      });
    }

    // 1.5. Move & Update Spring Pads (Trampolines & Springs for varied jumps)
    this.updateSpringPads(dt, shift);

    // 2. Move & Spawn Obstacles
    this.nextObstacleDistance -= shift;
    if (this.nextObstacleDistance <= 0) {
      this.spawnObstacle();
      const levelCfg = this.getCurrentLevelConfig();
      this.nextObstacleDistance = Math.random() * 320 + (500 - levelCfg.levelNumber * 40);
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= shift;

      // Near Miss check: player clearing obstacle closely
      if (!obs.passed) {
        const isPassing = this.player.x > obs.x + obs.width * 0.4 && this.player.x - (obs.x + obs.width) < 36;
        if (isPassing) {
          const playerBottom = this.player.y + this.player.height;
          const playerTop = this.player.y;
          const obsTop = obs.y;
          const obsBottom = obs.y + obs.height;

          let isNear = false;
          if (obs.requiresSlide) {
            if (this.player.isSliding && playerTop > obsBottom - 35) {
              isNear = true;
            }
          } else {
            if (playerBottom <= obsTop + 6 && obsTop - playerBottom < 38) {
              isNear = true;
            }
          }

          if (isNear) {
            obs.passed = true;
            this.triggerNearMiss(obs.x + obs.width / 2, obs.y);
          }
        }
      }

      // Check collision with player
      if (!obs.passed && this.checkObstacleCollision(obs)) {
        this.handleObstacleHit(obs);
      }

      if (obs.x + obs.width < -100) {
        this.obstacles.splice(i, 1);
      }
    }

    // 3. Move & Spawn Collectibles (spawn distance increased to reduce frequency by 50%)
    this.nextCollectibleDistance -= shift;
    if (this.nextCollectibleDistance <= 0) {
      this.spawnCollectibles();
      this.nextCollectibleDistance = Math.random() * 300 + 380;
    }

    const hasMagnet = this.activePowerUps.has('magnet') || (this.stats.feverTimer && this.stats.feverTimer > 0);
    // Shortened magnet pull radius for tighter, satisfying arcade collection
    const magnetPullRadius = (this.stats.feverTimer && this.stats.feverTimer > 0) ? 260 : (140 + this.upgrades.magnetTier * 20);
    const magnetSpeed = (this.stats.feverTimer && this.stats.feverTimer > 0) ? 800 : 550;

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.x -= shift;

      // Magnet attraction
      if (hasMagnet && !item.collected) {
        const dx = (this.player.x + this.player.width / 2) - (item.x + item.width / 2);
        const dy = (this.player.y + this.player.height / 2) - (item.y + item.height / 2);
        const dist = Math.hypot(dx, dy);

        if (dist < magnetPullRadius) {
          item.x += (dx / dist) * magnetSpeed * dt;
          item.y += (dy / dist) * magnetSpeed * dt;
        }
      }

      // Pickup collision
      if (!item.collected && this.checkCollectibleCollision(item)) {
        this.collectItem(item);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (item.x + item.width < -50) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private updateProjectiles(dt: number, currentSpeed: number) {
    const shift = currentSpeed * dt;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt - shift;
      proj.y += proj.vy * dt;
      proj.rotation += 8 * dt;

      // Banana trap hit on chaser
      if (proj.vx < 0) {
        if (
          proj.x < this.dog.x + this.dog.width &&
          proj.x > this.dog.x - 20 &&
          Math.abs(proj.y - (this.dog.y + this.dog.height - 20)) < 40
        ) {
          this.dog.isSlipped = true;
          this.dog.slipTimer = 2.0;
          this.dog.x = Math.max(20, this.dog.x - 140);
          soundEngine.playChaserSlip();
          soundEngine.speak('ვაი ჩემი სათვალე!');
          this.spawnFloatingText('SLIP! -140px', this.dog.x, this.dog.y - 30, '#F59E0B');

          for (let s = 0; s < 12; s++) {
            this.particles.push({
              x: proj.x,
              y: proj.y,
              vx: (Math.random() - 0.5) * 200,
              vy: -Math.random() * 150 - 50,
              size: Math.random() * 5 + 3,
              color: '#FBBF24',
              alpha: 1,
              life: 0,
              maxLife: 0.5,
              shape: 'spark',
            });
          }

          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Chaser thrown projectile flies toward Kote!
        proj.vy += 220 * dt;
        if (
          proj.x > this.player.x + 10 &&
          proj.x < this.player.x + this.player.width - 10 &&
          proj.y > this.player.y + 10 &&
          proj.y < this.player.y + this.player.height - 10
        ) {
          this.handleObstacleHit({
            id: proj.id,
            x: proj.x,
            y: proj.y,
            width: 30,
            height: 30,
            type: 'crate',
            passed: true,
            requiresSlide: false,
          });
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (proj.x < -100 || proj.x > this.width + 200 || proj.y > this.height + 50) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateWeather(dt: number, currentSpeed: number) {
    const level = this.currentLevelIndex + 1;
    if (level === 5) {
      this.thunderTimer -= dt;
      if (this.thunderTimer <= 0) {
        this.thunderTimer = Math.random() * 8 + 6;
        soundEngine.playThunder();
        this.flashTimer = 0.2;
        this.flashColor = 'rgba(255, 255, 255, 0.55)';
      }
    }

    for (const w of this.weatherParticles) {
      w.x += w.vx * dt - currentSpeed * dt * 0.3;
      w.y += w.vy * dt;
      w.rotation += w.rotSpeed * dt;

      if (w.x < -30) {
        w.x = this.width + 30;
        w.y = Math.random() * this.height;
      }
      if (w.y > this.height + 30) {
        w.y = -20;
        w.x = Math.random() * this.width;
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    if (this.floatingTexts.length > 10) {
      this.floatingTexts.splice(0, this.floatingTexts.length - 10);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y -= 45 * dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private spawnSpringPad() {
    const spawnX = this.width + 120;
    const plat = this.platforms.find(p => p.x <= spawnX && p.x + p.width >= spawnX);
    const groundY = plat ? plat.y : this.BASE_GROUND_Y;

    const isSuper = Math.random() > 0.65;
    const spring: SpringPad = {
      id: ++this.obstacleIdCounter,
      x: spawnX,
      y: groundY - 24,
      width: 48,
      height: 24,
      type: isSuper ? 'trampoline' : 'spring',
      bounceForce: isSuper ? -1350 : -1120,
      isCompressed: false,
      compressTimer: 0,
    };
    this.springPads.push(spring);

    // Spawn high-altitude arc of 3 toilet paper rolls (reduced by 50% to prevent lag)
    const paperCount = 3;
    const arcHeight = isSuper ? 180 : 130;
    for (let c = 0; c < paperCount; c++) {
      const progress = c / (paperCount - 1);
      const arcY = Math.sin(progress * Math.PI) * arcHeight;
      this.collectibles.push({
        id: ++this.obstacleIdCounter,
        x: spawnX + 15 + c * 60,
        y: groundY - 135 - arcY,
        width: 42,
        height: 42,
        type: 'coin',
        value: 25,
        collected: false,
        animTimer: c * 0.15,
      });
    }
  }

  private updateSpringPads(dt: number, shift: number) {
    this.nextSpringDistance -= shift;
    if (this.nextSpringDistance <= 0) {
      this.spawnSpringPad();
      this.nextSpringDistance = Math.random() * 450 + 650;
    }

    const p = this.player;
    for (let i = this.springPads.length - 1; i >= 0; i--) {
      const sp = this.springPads[i];
      sp.x -= shift;

      if (sp.compressTimer > 0) {
        sp.compressTimer -= dt;
        if (sp.compressTimer <= 0) {
          sp.isCompressed = false;
        }
      }

      // Check collision with player
      const pBottom = p.y + p.height;
      const prevBottom = pBottom - p.vy * dt;
      const overlapsX = p.x + p.width * 0.7 > sp.x && p.x + p.width * 0.3 < sp.x + sp.width;

      if (
        overlapsX &&
        prevBottom <= sp.y + 16 &&
        pBottom >= sp.y &&
        p.vy >= 0
      ) {
        // Trigger Mega Bounce!
        p.y = sp.y - p.height;
        p.vy = sp.bounceForce;
        p.isGrounded = false;
        p.jumpCount = 0; // Grants double-jump capability in mid-air!
        this.coyoteTimer = 0;

        sp.isCompressed = true;
        sp.compressTimer = 0.22;

        soundEngine.playSpring();
        this.spawnFloatingText(
          sp.type === 'trampoline' ? '🚀 სუპერ ტრამპლინი!' : '⚡ ასახტომი ზამბარა!',
          sp.x,
          sp.y - 30,
          '#F59E0B'
        );

        // Blast burst particles
        for (let k = 0; k < 12; k++) {
          this.particles.push({
            x: sp.x + sp.width / 2,
            y: sp.y,
            vx: (Math.random() - 0.5) * 260,
            vy: -Math.random() * 180 - 80,
            size: Math.random() * 5 + 3,
            color: sp.type === 'trampoline' ? '#06B6D4' : '#F59E0B',
            alpha: 1,
            life: 0,
            maxLife: 0.45,
            shape: 'spark',
          });
        }
      }

      if (sp.x + sp.width < -100) {
        this.springPads.splice(i, 1);
      }
    }
  }

  private spawnObstacle() {
    const types: { type: ObstacleType; w: number; h: number; requiresSlide: boolean; yOffset: number }[] = [
      { type: 'barrel', w: 46, h: 56, requiresSlide: false, yOffset: 0 },
      { type: 'hay_bale', w: 62, h: 48, requiresSlide: false, yOffset: 0 },
      { type: 'stone_rock', w: 52, h: 46, requiresSlide: false, yOffset: 0 },
      { type: 'wooden_fence', w: 70, h: 62, requiresSlide: false, yOffset: 0 },
      { type: 'crate', w: 48, h: 48, requiresSlide: false, yOffset: 0 },
      { type: 'flying_toilet', w: 86, h: 54, requiresSlide: true, yOffset: -65 }, // Hovering Jet Toilet: slide/duck under!
    ];

    const pick = types[Math.floor(Math.random() * types.length)];
    const spawnX = this.width + 80;

    // Find platform at spawnX
    const plat = this.platforms.find(p => p.x <= spawnX && p.x + p.width >= spawnX);
    const groundY = plat ? plat.y : this.BASE_GROUND_Y;

    this.obstacles.push({
      id: ++this.obstacleIdCounter,
      x: spawnX,
      y: groundY - pick.h + pick.yOffset,
      width: pick.w,
      height: pick.h,
      type: pick.type,
      passed: false,
      requiresSlide: pick.requiresSlide,
    });
  }

  private spawnCollectibles() {
    const spawnX = this.width + 50;
    const plat = this.platforms.find(p => p.x <= spawnX && p.x + p.width >= spawnX);
    const groundY = plat ? plat.y : this.BASE_GROUND_Y;

    // Chance to spawn special power-up
    const powerUpRoll = Math.random();
    if (powerUpRoll < 0.18) {
      const pTypes: PowerUpType[] = ['magnet', 'speed', 'bone', 'shield'];
      const pType = pTypes[Math.floor(Math.random() * pTypes.length)];

      this.collectibles.push({
        id: ++this.obstacleIdCounter,
        x: spawnX,
        y: groundY - 110,
        width: 40,
        height: 40,
        type: pType,
        value: 50,
        collected: false,
        animTimer: 0,
      });
      return;
    }

    // Otherwise spawn toilet paper roll arc (2 to 3 rolls, reduced by 50% for smooth performance)
    const coinCount = Math.floor(Math.random() * 2) + 2;
    const arcHeight = 70;

    for (let c = 0; c < coinCount; c++) {
      const progress = coinCount > 1 ? c / (coinCount - 1) : 0.5;
      // Arc formula
      const arcY = Math.sin(progress * Math.PI) * arcHeight;
      this.collectibles.push({
        id: ++this.obstacleIdCounter,
        x: spawnX + c * 58,
        y: groundY - 80 - arcY,
        width: 42,
        height: 42,
        type: 'coin',
        value: 20, // +100% value to keep rewards fair with 50% fewer coins
        collected: false,
        animTimer: c * 0.15,
      });
    }
  }

  private checkObstacleCollision(obs: Obstacle): boolean {
    const p = this.player;
    if (p.invincibleTimer > 0) return false;

    // Bounding box collision with slight inner padding
    const pLeft = p.x + 12;
    const pRight = p.x + p.width - 12;
    const pTop = p.y + 10;
    const pBottom = p.y + p.height - 4;

    const oLeft = obs.x + 6;
    const oRight = obs.x + obs.width - 6;
    const oTop = obs.y + 6;
    const oBottom = obs.y + obs.height - 4;

    const overlaps = pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom;

    if (!overlaps) return false;

    // If obstacle requires slide and player is sliding, pass through safely!
    if (obs.requiresSlide && p.isSliding) {
      return false;
    }

    return true;
  }

  private handleObstacleHit(obs: Obstacle) {
    obs.passed = true;

    // Check if shield active
    const shield = this.activePowerUps.get('shield');
    if (shield) {
      this.activePowerUps.delete('shield');
      soundEngine.playHit();
      this.flashTimer = 0.25;
      this.flashColor = 'rgba(6, 182, 212, 0.4)';
      this.spawnFloatingText('🛡️ ფარმა გადაგარჩინა!', this.player.x, this.player.y - 30, '#38BDF8');

      // Shield breakup particles
      for (let i = 0; i < 15; i++) {
        this.particles.push({
          x: this.player.x + this.player.width / 2,
          y: this.player.y + this.player.height / 2,
          vx: (Math.random() - 0.5) * 350,
          vy: (Math.random() - 0.5) * 350,
          size: Math.random() * 6 + 3,
          color: '#38BDF8',
          alpha: 1,
          life: 0,
          maxLife: 0.4,
          shape: 'spark',
        });
      }
      return;
    }

    // Otherwise stumble!
    this.feverStreak = 0;
    this.stats.feverStreak = 0;
    this.player.stumbleTimer = 0.9;
    this.player.invincibleTimer = 1.2;
    soundEngine.playHit();
    this.spawnFloatingText('⚠️ დაბრკოლება!', this.player.x, this.player.y - 30, '#EF4444');

    // Screen Shake & Red flash
    this.shakeTimer = 0.3;
    this.shakeIntensity = 8;
    this.flashTimer = 0.25;
    this.flashColor = 'rgba(239, 68, 68, 0.45)';

    // Dog rushes 70px closer!
    this.dog.x = Math.min(this.player.x - 40, this.dog.x + 70);
    this.stats.dogDistance = Math.max(0, this.player.x - this.dog.x);

    // Stumble impact particles
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: obs.x + obs.width / 2,
        y: obs.y + obs.height / 2,
        vx: (Math.random() - 0.5) * 240,
        vy: -Math.random() * 180 - 40,
        size: Math.random() * 5 + 3,
        color: '#EA580C',
        alpha: 1,
        life: 0,
        maxLife: 0.5,
        shape: 'spark',
      });
    }

    // If dog is right on player -> caught!
    if (this.stats.dogDistance <= 25) {
      this.triggerGameOver('მდევარმა დაგიჭირა!');
    }
  }

  private checkCollectibleCollision(item: Collectible): boolean {
    const p = this.player;
    const margin = 8; // generous +30% pickup radius
    return (
      p.x + p.width > item.x - margin &&
      p.x < item.x + item.width + margin &&
      p.y + p.height > item.y - margin &&
      p.y < item.y + item.height + margin
    );
  }

  private collectItem(item: Collectible) {
    item.collected = true;

    if (item.type === 'coin') {
      let earnedCoins = 2;
      if (this.selectedSkin === 'vip') {
        earnedCoins = 4; // x2 VIP Gold Multiplier!
      } else if (this.selectedSkin === 'new_year') {
        earnedCoins = 3; // +50% New Year gift coins!
      }
      this.stats.coins += earnedCoins;
      localStorage.setItem('pixel_runner_coins', this.stats.coins.toString());
      this.stats.combo += 1;
      this.feverStreak += 1;
      this.stats.feverStreak = this.feverStreak;

      // Trigger Fever Mode on 6 toilet paper streak (adjusted for 50% fewer coins)
      if (this.feverStreak >= 6 && (!this.stats.feverTimer || this.stats.feverTimer <= 0)) {
        this.stats.feverTimer = 6.5;
        this.feverStreak = 0;
        soundEngine.playFeverMode();
        soundEngine.speak('სუპერ რეჟიმი!');
        this.spawnFloatingText('🧻 სუპერ ქაღალდი! x3 🧻', this.player.x, this.player.y - 45, '#F59E0B');
        this.flashTimer = 0.3;
        this.flashColor = 'rgba(251, 191, 36, 0.4)';
      }

      this.stats.score += item.value * this.stats.multiplier;
      soundEngine.playCoin(this.stats.combo);
      this.spawnFloatingText(`+${item.value * this.stats.multiplier} 🧻`, item.x, item.y - 12, '#FFFFFF');

      // Light flutter confetti (3 particles for zero stutter)
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: item.x + item.width / 2,
          y: item.y + item.height / 2,
          vx: (Math.random() - 0.5) * 140,
          vy: (Math.random() - 0.5) * 140,
          size: Math.random() * 4 + 2,
          color: Math.random() > 0.4 ? '#FFFFFF' : '#E2E8F0',
          alpha: 1,
          life: 0,
          maxLife: 0.3,
          shape: 'smoke',
        });
      }
    } else {
      // PowerUp collected!
      soundEngine.playPowerUp();
      const durationMap: Record<PowerUpType, number> = {
        magnet: 9.0 + this.upgrades.magnetTier * 3.0,
        speed: 5.5 + this.upgrades.speedTier * 2.0,
        bone: 12.0,
        shield: 14.0 + this.upgrades.shieldTier * 6.0,
      };

      const labels: Record<PowerUpType, string> = {
        magnet: '🧲 მაგნიტი!',
        speed: '⚡ აჩქარება!',
        bone: '🦴 ძვალი!',
        shield: '🛡️ ფარი!',
      };

      this.activePowerUps.set(item.type, {
        type: item.type,
        duration: durationMap[item.type],
        remaining: durationMap[item.type],
      });

      this.spawnFloatingText(labels[item.type], item.x, item.y - 25, '#38BDF8');

      // Special instantaneous action for bone
      if (item.type === 'bone') {
        if (this.stats.dogDistance < 120) {
          this.distractDogWithBone();
        }
      }

      // Power-up pickup burst (8 particles for efficiency)
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: item.x + item.width / 2,
          y: item.y + item.height / 2,
          vx: (Math.random() - 0.5) * 220,
          vy: (Math.random() - 0.5) * 220,
          size: Math.random() * 5 + 3,
          color: '#38BDF8',
          alpha: 1,
          life: 0,
          maxLife: 0.4,
          shape: 'circle',
        });
      }
    }
  }

  private updateParticles(dt: number) {
    if (this.particles.length > 60) {
      this.particles.splice(0, this.particles.length - 60);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life += dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.alpha = Math.max(0, 1 - part.life / part.maxLife);

      if (part.life >= part.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private triggerGameOver(reason: string) {
    this.status = 'GAMEOVER';
    soundEngine.stopMusic();
    soundEngine.playGameOver();

    // Shockwave at collision point
    this.shakeTimer = 0.5;
    this.shakeIntensity = 14;
    this.flashTimer = 0.4;
    this.flashColor = 'rgba(239, 68, 68, 0.6)';

    if (this.onStatsUpdate) {
      this.onStatsUpdate(
        { ...this.stats },
        Array.from(this.activePowerUps.values()),
        this.status
      );
    }
  }

  // ------------------ RENDERING ------------------

  public render() {
    const ctx = this.ctx;
    ctx.save();

    // Apply Screen Shake
    if (this.shakeTimer > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Parallax Background
    this.renderParallaxBackground();

    // 2. Draw Weather Atmosphere (Behind foreground objects)
    this.renderWeather();

    // 3. Draw Platforms
    this.renderPlatforms();

    // 3.5. Draw Spring Pads (Interactive Springs & Trampolines)
    this.renderSpringPads();

    // 4. Draw Collectibles (Toilet paper rolls)
    this.renderCollectibles();

    // 5. Draw Obstacles
    this.renderObstacles();

    // 6. Draw Projectiles (Banana traps, thrown obstacles)
    this.renderProjectiles();

    // 7. Draw Chasing Enemy (Human with glasses)
    this.renderDog();

    // 8. Draw Player Character (Kote with shadows, squash & stretch)
    this.renderPlayer();

    // 9. Draw Particle Effects
    this.renderParticles();

    // 10. Draw Floating Pop-Up Badges & Texts
    this.renderFloatingTexts();

    // 11. Draw Flash overlay
    if (this.flashTimer > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 12. Danger vignette if chaser is dangerously close
    if (this.stats.dogDistance < 100 && this.status === 'PLAYING') {
      const alpha = Math.min(0.45, (100 - this.stats.dogDistance) / 100 * 0.45);
      const grad = ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.height * 0.35,
        this.width / 2, this.height / 2, this.height * 0.8
      );
      grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      grad.addColorStop(1, `rgba(239, 68, 68, ${alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 13. Fever Mode Frenzy Gold/Rainbow Vignette Border
    if (this.stats.feverTimer && this.stats.feverTimer > 0 && this.status === 'PLAYING') {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.012);
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 + pulse * 0.4})`;
      ctx.lineWidth = 8 + pulse * 4;
      ctx.strokeRect(0, 0, this.width, this.height);

      // Top floating Fever banner
      ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ სუპერ რეჟიმი (${Math.ceil(this.stats.feverTimer)}s) - 3X 🧻 ტუალეტის ქაღალდი! ⚡`, this.width / 2, 38);
    }

    ctx.restore();
  }

  private renderParallaxBackground() {
    const ctx = this.ctx;
    const level = this.getCurrentLevelConfig();

    // 1. Caucasus sunset twilight sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#0F0C20'); // deep cosmic twilight indigo
    skyGrad.addColorStop(0.3, '#31145A');
    skyGrad.addColorStop(0.58, '#831843'); // vivid Georgian pomegranate crimson
    skyGrad.addColorStop(0.82, '#C2410C'); // fiery Caucasian sunset orange
    skyGrad.addColorStop(1, '#D97706'); // warm golden dusk horizon

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Glowing sunset sun with multi-ring luminous corona behind peaks
    const sunX = this.width * 0.58;
    const sunY = 160;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 90);
    sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
    sunGrad.addColorStop(0.4, 'rgba(251, 146, 60, 0.45)');
    sunGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
    ctx.fill();

    // Golden sun core
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();

    // Drifting sunset clouds (Slow parallax)
    const cloudOffset = (this.cityOffset * 0.12) % (this.width + 300);
    ctx.fillStyle = 'rgba(254, 215, 170, 0.22)';
    for (let c = 0; c < 4; c++) {
      const cx = ((c * 340 - cloudOffset) % (this.width + 400)) - 100;
      const cy = 60 + (c % 2) * 45;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.arc(cx + 25, cy - 8, 36, 0, Math.PI * 2);
      ctx.arc(cx + 60, cy - 4, 30, 0, Math.PI * 2);
      ctx.arc(cx + 85, cy + 2, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Distant Snow-Capped Caucasus Peaks (სვანეთის/ყაზბეგის მთები)
    const mtnOffset = (this.cityOffset * 0.2) % 400;
    ctx.fillStyle = '#26123D';
    ctx.beginPath();
    ctx.moveTo(-100, this.height);
    for (let mx = -100; mx < this.width + 400; mx += 140) {
      const peakX = mx - mtnOffset;
      const peakY = 190 + Math.sin(mx * 0.05) * 55;
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX + 70, peakY + 80);
    }
    ctx.lineTo(this.width + 100, this.height);
    ctx.closePath();
    ctx.fill();

    // Snow caps on distant peaks
    ctx.fillStyle = 'rgba(248, 250, 252, 0.4)';
    for (let mx = -100; mx < this.width + 400; mx += 140) {
      const peakX = mx - mtnOffset;
      const peakY = 190 + Math.sin(mx * 0.05) * 55;
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(peakX - 18, peakY + 28);
      ctx.lineTo(peakX, peakY + 20);
      ctx.lineTo(peakX + 22, peakY + 32);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Georgian Village & Fortress 2D Pixel Art Background
    if (spriteCache.bgImage) {
      const bg = spriteCache.bgImage;
      const bgW = bg.width;
      const bgH = bg.height;
      const drawH = this.height * 0.78;
      const drawW = (drawH / bgH) * bgW;
      const startX = -((this.cityOffset * 0.45) % drawW);

      ctx.save();
      ctx.globalAlpha = 0.88;
      if (level.skyFilter !== 'none') {
        ctx.filter = level.skyFilter;
      }
      ctx.drawImage(bg, startX, 40, drawW, drawH);
      ctx.drawImage(bg, startX + drawW, 40, drawW, drawH);
      if (startX + drawW * 2 < this.width) {
        ctx.drawImage(bg, startX + drawW * 2, 40, drawW, drawH);
      }
      ctx.restore();
    } else {
      // Procedural Svanetian Towers & Ancient Castles (სვანური კოშკები)
      const towerOffset = (this.cityOffset * 0.45) % (this.width + 300);
      for (let t = 0; t < 9; t++) {
        const tx = ((t * 160 - towerOffset) % (this.width + 300)) - 60;
        const th = 170 + (t % 3) * 35;
        const ty = this.BASE_GROUND_Y - th;

        // Tapered stone tower body
        ctx.fillStyle = '#1C1917';
        ctx.beginPath();
        ctx.moveTo(tx + 4, ty + 24);
        ctx.lineTo(tx + 44, ty + 24);
        ctx.lineTo(tx + 50, this.BASE_GROUND_Y);
        ctx.lineTo(tx - 2, this.BASE_GROUND_Y);
        ctx.closePath();
        ctx.fill();

        // Tower crenellation top crown
        ctx.fillStyle = '#292524';
        ctx.fillRect(tx, ty + 6, 48, 18);
        ctx.fillStyle = '#1C1917';
        ctx.fillRect(tx + 8, ty, 8, 8);
        ctx.fillRect(tx + 24, ty, 8, 8);
        ctx.fillRect(tx + 40, ty, 8, 8);

        // Warm glowing lantern window
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(tx + 18, ty + 50, 10, 14);
        ctx.fillRect(tx + 20, ty + 95, 8, 12);
      }
    }
  }

  private renderPlatforms() {
    const ctx = this.ctx;

    for (const plat of this.platforms) {
      if (plat.x + plat.width < 0 || plat.x > this.width) continue;

      if (plat.type === 'rooftop') {
        // ================= TRADITIONAL GEORGIAN TERRACOTTA ROOFTOP (კრამიტი) =================
        // Dark roof timber base
        ctx.fillStyle = '#291104';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        // Exposed wooden support rafters underneath roof
        ctx.fillStyle = '#451A03';
        ctx.fillRect(plat.x, plat.y + 24, plat.width, 16);
        ctx.fillStyle = '#78350F';
        for (let rx = plat.x; rx < plat.x + plat.width; rx += 36) {
          ctx.fillRect(rx + 6, plat.y + 24, 12, plat.height - 24);
          // Iron structural nail head
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(rx + 10, plat.y + 30, 4, 4);
          ctx.fillStyle = '#78350F';
        }

        // Curved Terracotta Clay Tiles (კრამიტის რიგები)
        const tileW = 28;
        const tileH = 14;
        const rows = 3;

        for (let row = 0; row < rows; row++) {
          const rowY = plat.y + row * (tileH - 4);
          const xOffset = (row % 2) * (tileW / 2);

          for (let tx = plat.x - tileW + xOffset; tx < plat.x + plat.width; tx += tileW) {
            if (tx + tileW < plat.x || tx > plat.x + plat.width) continue;

            const clampX = Math.max(plat.x, tx);
            const clampW = Math.min(plat.x + plat.width - clampX, tileW);

            // Shingle shadow
            ctx.fillStyle = '#7C2D12';
            ctx.beginPath();
            ctx.roundRect(clampX, rowY + 3, clampW, tileH, [4, 4, 10, 10]);
            ctx.fill();

            // Rich terracotta shingle body
            const tileGrad = ctx.createLinearGradient(clampX, rowY, clampX + clampW, rowY);
            tileGrad.addColorStop(0, '#9A3412');
            tileGrad.addColorStop(0.45, '#EA580C');
            tileGrad.addColorStop(0.85, '#C2410C');
            tileGrad.addColorStop(1, '#7C2D12');

            ctx.fillStyle = tileGrad;
            ctx.beginPath();
            ctx.roundRect(clampX + 1, rowY, clampW - 2, tileH - 2, [4, 4, 8, 8]);
            ctx.fill();

            // Highlight on curved crest of clay tile
            ctx.fillStyle = '#FB923C';
            ctx.fillRect(clampX + 4, rowY + 1, clampW * 0.45, 2);
          }
        }

        // Top ridge cap line
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(plat.x, plat.y, plat.width, 3);
        ctx.fillStyle = '#FED7AA';
        ctx.fillRect(plat.x, plat.y, plat.width, 1);
      } else {
        // ================= AUTHENTIC GEORGIAN COBBLESTONE ROAD & STONE WALL (ქვაფენილი) =================
        // 1. Deep Earth Foundation
        const baseGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.height);
        baseGrad.addColorStop(0, '#292524');
        baseGrad.addColorStop(0.4, '#1C1917');
        baseGrad.addColorStop(1, '#0C0A09');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        // 2. Ancient Ashlar Cut-Stone Fortress Wall Blocks (Masonry courses)
        const courseH = 26;
        const blockW = 68;
        for (let cy = plat.y + 26; cy < plat.y + plat.height; cy += courseH) {
          const rowIdx = Math.floor((cy - plat.y) / courseH);
          const rowOffset = (rowIdx % 2) * (blockW / 2);

          // Horizontal mortar joint
          ctx.fillStyle = '#171412';
          ctx.fillRect(plat.x, cy, plat.width, 2.5);

          for (let bx = plat.x - blockW + rowOffset; bx < plat.x + plat.width; bx += blockW) {
            // Vertical mortar seam
            ctx.fillStyle = '#171412';
            ctx.fillRect(bx, cy, 2.5, courseH);

            // Chiseled sandstone block relief
            ctx.fillStyle = rowIdx % 3 === 0 ? '#38332E' : rowIdx % 3 === 1 ? '#2E2A26' : '#332E29';
            ctx.fillRect(bx + 2.5, cy + 2.5, blockW - 3.5, courseH - 3.5);

            // Subtle top bevel highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.fillRect(bx + 3, cy + 2.5, blockW - 5, 2);
          }
        }

        // 3. Realistic Georgian Cobblestone Paving Stones (ქვაფენილი)
        const cobbleRowH = 22;
        ctx.fillStyle = '#171412'; // dark mortar bed
        ctx.fillRect(plat.x, plat.y, plat.width, cobbleRowH);

        const stones = [
          { w: 26, color: '#78716C', hi: '#A8A29E' },
          { w: 34, color: '#57534E', hi: '#78716C' },
          { w: 22, color: '#44403C', hi: '#57534E' },
          { w: 30, color: '#6B5E51', hi: '#8D7B68' }, // warm sandstone hue
          { w: 28, color: '#524A42', hi: '#736B62' },
        ];

        let curX = plat.x;
        let sIdx = 0;
        while (curX < plat.x + plat.width) {
          const stone = stones[sIdx % stones.length];
          const stW = Math.min(plat.x + plat.width - curX, stone.w);

          // Stone body
          ctx.fillStyle = stone.color;
          ctx.beginPath();
          ctx.roundRect(curX + 2, plat.y + 2, stW - 3, cobbleRowH - 4, [4, 4, 3, 3]);
          ctx.fill();

          // Highlight on curved stone top
          ctx.fillStyle = stone.hi;
          ctx.beginPath();
          ctx.roundRect(curX + 4, plat.y + 3, stW - 7, 3, 2);
          ctx.fill();

          // Emerald moss nestled in cobblestone cracks
          if ((sIdx * 7) % 5 === 0) {
            ctx.fillStyle = '#65A30D';
            ctx.fillRect(curX, plat.y + cobbleRowH - 6, 4, 4);
            ctx.fillStyle = '#84CC16';
            ctx.fillRect(curX + 1, plat.y + cobbleRowH - 5, 2, 2);
          }

          curX += stW;
          sIdx++;
        }

        // 4. Emerald green moss & grass fringe along top walking edge
        ctx.fillStyle = '#4D7C0F';
        ctx.fillRect(plat.x, plat.y, plat.width, 2.5);
        ctx.fillStyle = '#84CC16';
        for (let gx = plat.x; gx < plat.x + plat.width; gx += 14) {
          ctx.fillRect(gx + 2, plat.y - 1, 4, 2);
        }
      }
    }
  }

  private renderSpringPads() {
    const ctx = this.ctx;

    for (const sp of this.springPads) {
      if (sp.x + sp.width < 0 || sp.x > this.width) continue;

      ctx.save();
      const isTrampoline = sp.type === 'trampoline';
      const compression = sp.isCompressed ? 0.45 : 1.0;
      const currentHeight = sp.height * compression;
      const currentY = sp.y + (sp.height - currentHeight);

      // 1. Soft drop shadow beneath pad
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(sp.x + sp.width / 2, sp.y + sp.height + 2, sp.width * 0.48, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Heavy-duty cast iron base
      ctx.fillStyle = '#111827';
      ctx.fillRect(sp.x + 2, sp.y + sp.height - 5, sp.width - 4, 7);
      // Fastening anchor bolts
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(sp.x + 6, sp.y + sp.height - 4, 3, 3);
      ctx.fillRect(sp.x + sp.width - 9, sp.y + sp.height - 4, 3, 3);

      if (isTrampoline) {
        // ================= HIGH-TECH NEON TRAMPOLINE BED =================
        // Tubular chrome frame legs
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sp.x + 5, sp.y + sp.height - 2);
        ctx.lineTo(sp.x + 12, currentY + 6);
        ctx.moveTo(sp.x + sp.width - 5, sp.y + sp.height - 2);
        ctx.lineTo(sp.x + sp.width - 12, currentY + 6);
        ctx.stroke();

        // High-elasticity woven cyan mat with cross-stitch
        ctx.fillStyle = '#0891B2';
        ctx.beginPath();
        ctx.roundRect(sp.x, currentY, sp.width, 11, 4);
        ctx.fill();

        // Neon cyan rim with glow
        ctx.fillStyle = '#22D3EE';
        ctx.fillRect(sp.x + 3, currentY + 2, sp.width - 6, 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sp.x + 8, currentY + 2, sp.width - 16, 1.5);

        // Glowing directional neon arrow glyphs
        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▲▲', sp.x + sp.width / 2, currentY - 5);
      } else {
        // ================= HEAVY INDUSTRIAL MECHANICAL COIL SPRING =================
        // Tempered Steel Coils with 3D metallic shading
        const coils = 4;
        const coilHeight = (currentHeight - 8) / coils;
        const cx = sp.x + sp.width / 2;

        // Shadow coil behind
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx, sp.y + sp.height - 5);
        for (let c = 0; c < coils; c++) {
          const cy = sp.y + sp.height - 5 - (c + 0.5) * coilHeight;
          const xOffset = (c % 2 === 0 ? 1 : -1) * 13;
          ctx.lineTo(cx + xOffset, cy);
        }
        ctx.lineTo(cx, currentY + 6);
        ctx.stroke();

        // Golden metallic coil in front
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx, sp.y + sp.height - 5);
        for (let c = 0; c < coils; c++) {
          const cy = sp.y + sp.height - 5 - (c + 0.5) * coilHeight;
          const xOffset = (c % 2 === 0 ? 1 : -1) * 13;
          ctx.lineTo(cx + xOffset, cy);
        }
        ctx.lineTo(cx, currentY + 6);
        ctx.stroke();

        // Coil metallic chrome highlight
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let c = 0; c < coils; c++) {
          const cy = sp.y + sp.height - 5 - (c + 0.5) * coilHeight;
          const xOffset = (c % 2 === 0 ? 1 : -1) * 11;
          ctx.moveTo(cx + xOffset * 0.5, cy - 2);
          ctx.lineTo(cx + xOffset, cy);
        }
        ctx.stroke();

        // Bouncy cap plate with hazard chevron warning stripes
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.roundRect(sp.x + 2, currentY, sp.width - 4, 10, 3);
        ctx.fill();

        // Yellow chevron stripes
        ctx.fillStyle = '#FDE047';
        for (let z = sp.x + 6; z < sp.x + sp.width - 8; z += 12) {
          ctx.beginPath();
          ctx.moveTo(z, currentY + 2);
          ctx.lineTo(z + 5, currentY + 2);
          ctx.lineTo(z + 2, currentY + 8);
          ctx.lineTo(z - 3, currentY + 8);
          ctx.closePath();
          ctx.fill();
        }

        // Up arrow indicator
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▲', sp.x + sp.width / 2, currentY - 4);
      }

      ctx.restore();
    }
  }

  private drawToiletPaperFallback(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    animTimer: number
  ) {
    const bob = Math.sin(animTimer * 5) * 3;
    const drawY = y + bob;

    ctx.save();
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 2, w * 0.42, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden collection aura halo
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w / 2, drawY + h / 2, w * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    // 1. Quilted Multi-ply White Paper Cylinder
    const rollGrad = ctx.createLinearGradient(x + 4, drawY, x + w - 4, drawY);
    rollGrad.addColorStop(0, '#E2E8F0');
    rollGrad.addColorStop(0.2, '#FFFFFF');
    rollGrad.addColorStop(0.8, '#F8FAFC');
    rollGrad.addColorStop(1, '#CBD5E1');

    ctx.fillStyle = rollGrad;
    ctx.beginPath();
    ctx.roundRect(x + 5, drawY + 4, w - 10, h - 8, [5, 5, 7, 7]);
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Embossed Diamond Quilted Texture on Paper
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    for (let qy = drawY + 8; qy < drawY + h - 10; qy += 7) {
      for (let qx = x + 8; qx < x + w - 10; qx += 8) {
        ctx.fillRect(qx, qy, 2, 2);
      }
    }

    // 3. Perspective Oval Top & Cardboard Core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.46, drawY + 8, w * 0.36, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cardboard tube core with depth
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.46, drawY + 8, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451A03';
    ctx.stroke();

    // Inner hollow void
    ctx.fillStyle = '#1C1917';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.46, drawY + 8.5, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Trailing fluttering loose sheet with perforation dots
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 7, drawY + h - 8);
    ctx.quadraticCurveTo(x - 8, drawY + h + 4, x - 2, drawY + h + 12);
    ctx.lineTo(x + 6, drawY + h + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Perforation dotted line
    ctx.strokeStyle = '#94A3B8';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(x + 1, drawY + h + 1);
    ctx.lineTo(x + 8, drawY + h + 4);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sparkle star
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(x + w - 7, drawY + 2, 3, 3);
    ctx.fillRect(x + w - 8, drawY + 3, 5, 1);

    ctx.restore();
  }

  private renderCollectibles() {
    const ctx = this.ctx;

    for (const item of this.collectibles) {
      if (item.x + item.width < 0 || item.x > this.width) continue;

      if (item.type === 'coin') {
        if (spriteCache.coinFrames.length > 0) {
          const frameIdx = Math.floor(item.animTimer * 10) % spriteCache.coinFrames.length;
          const frame = spriteCache.coinFrames[frameIdx];
          ctx.drawImage(frame, item.x - 4, item.y - 4, item.width + 8, item.height + 8);
        } else {
          this.drawToiletPaperFallback(ctx, item.x, item.y, item.width, item.height, item.animTimer);
        }
      } else {
        // High-definition Power-Up with pulsating halo aura
        ctx.save();
        const pulse = Math.sin(item.animTimer * 6) * 3;
        const haloColor =
          item.type === 'magnet'
            ? 'rgba(56, 189, 248, 0.45)'
            : item.type === 'speed'
            ? 'rgba(251, 191, 36, 0.45)'
            : item.type === 'shield'
            ? 'rgba(6, 182, 212, 0.45)'
            : 'rgba(234, 179, 8, 0.45)';

        ctx.strokeStyle = haloColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width * 0.55 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        let icon: HTMLCanvasElement | null = null;
        if (item.type === 'magnet') icon = spriteCache.magnetIcon;
        else if (item.type === 'speed') icon = spriteCache.speedIcon;
        else if (item.type === 'shield') icon = spriteCache.shieldIcon;
        else if (item.type === 'bone') icon = spriteCache.boneIcon;

        if (icon) {
          ctx.drawImage(icon, item.x, item.y, item.width, item.height);
        }
        ctx.restore();
      }
    }
  }

  private renderObstacles() {
    const ctx = this.ctx;

    for (const obs of this.obstacles) {
      if (obs.x + obs.width < 0 || obs.x > this.width) continue;

      ctx.save();

      // Soft drop shadow beneath every obstacle
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height + 1, obs.width * 0.48, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (obs.type === 'barrel') {
        // ================= GEORGIAN AGED OAK WINE BARREL (ღვინის კასრი) =================
        const cx = obs.x + obs.width / 2;
        const cy = obs.y + obs.height / 2;

        // Rich dark oak gradient
        const oakGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y);
        oakGrad.addColorStop(0, '#5A2A0B');
        oakGrad.addColorStop(0.3, '#92400E');
        oakGrad.addColorStop(0.7, '#B45309');
        oakGrad.addColorStop(1, '#5A2A0B');

        ctx.fillStyle = oakGrad;
        ctx.beginPath();
        ctx.roundRect(obs.x + 1, obs.y + 1, obs.width - 2, obs.height - 2, 10);
        ctx.fill();
        ctx.strokeStyle = '#291104';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Vertical oak wood planks seams
        ctx.strokeStyle = '#451A03';
        ctx.lineWidth = 1.5;
        const staves = [0.22, 0.4, 0.6, 0.78];
        staves.forEach(st => {
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width * st, obs.y + 2);
          ctx.lineTo(obs.x + obs.width * st, obs.y + obs.height - 2);
          ctx.stroke();
        });

        // 3 Hammered Dark Iron Barrel Hoops
        const hoopYPositions = [obs.y + 8, cy - 3, obs.y + obs.height - 14];
        hoopYPositions.forEach((hy) => {
          ctx.fillStyle = '#1F2937';
          ctx.fillRect(obs.x, hy, obs.width, 6);
          ctx.fillStyle = '#4B5563';
          ctx.fillRect(obs.x, hy, obs.width, 1.5);
          ctx.fillStyle = '#D1D5DB';
          ctx.fillRect(obs.x + 8, hy + 1.5, 3, 3);
          ctx.fillRect(obs.x + obs.width - 11, hy + 1.5, 3, 3);
        });

        // Brass wine spigot tap
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx - 3, cy + 4, 6, 6);
        ctx.fillStyle = '#DC2626'; // ruby wine drop
        ctx.beginPath();
        ctx.arc(cx, cy + 12, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Tbilisi Winery emblem stamp
        ctx.fillStyle = '#881337';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TBS', cx, cy - 6);
      } else if (obs.type === 'hay_bale') {
        // ================= GOLDEN CAUCASIAN WHEAT HAY BALE (თივის ზვინი) =================
        const hayGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
        hayGrad.addColorStop(0, '#FEF08A');
        hayGrad.addColorStop(0.3, '#EAB308');
        hayGrad.addColorStop(0.85, '#CA8A04');
        hayGrad.addColorStop(1, '#854D0E');

        ctx.fillStyle = hayGrad;
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 6);
        ctx.fill();
        ctx.strokeStyle = '#713F12';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Individual textured straw fiber flecks
        ctx.fillStyle = '#FEF9C3';
        for (let s = 0; s < 18; s++) {
          const sx = obs.x + 4 + ((s * 17) % (obs.width - 12));
          const sy = obs.y + 4 + ((s * 11) % (obs.height - 8));
          ctx.fillRect(sx, sy, 7, 1.5);
        }
        ctx.fillStyle = '#854D0E';
        for (let s = 0; s < 12; s++) {
          const sx = obs.x + 6 + ((s * 23) % (obs.width - 14));
          const sy = obs.y + 6 + ((s * 13) % (obs.height - 10));
          ctx.fillRect(sx, sy, 6, 1.5);
        }

        // Dual Twisted Rustic Coarse Hemp Ropes
        const ropePositions = [obs.x + 14, obs.x + obs.width - 18];
        ropePositions.forEach(rx => {
          ctx.fillStyle = '#451A03';
          ctx.fillRect(rx - 0.5, obs.y, 5, obs.height);
          ctx.fillStyle = '#A16207';
          ctx.fillRect(rx, obs.y, 4, obs.height);
          ctx.fillStyle = '#FDE047';
          for (let ry = obs.y + 2; ry < obs.y + obs.height; ry += 6) {
            ctx.fillRect(rx + 1, ry, 2, 2.5);
          }
          ctx.fillStyle = '#78350F';
          ctx.fillRect(rx - 2, obs.y + obs.height / 2 - 3, 8, 6);
        });

        // Loose straw stalks sticking out of edges
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + 8);
        ctx.lineTo(obs.x - 4, obs.y + 5);
        ctx.moveTo(obs.x + obs.width, obs.y + 14);
        ctx.lineTo(obs.x + obs.width + 5, obs.y + 11);
        ctx.stroke();
      } else if (obs.type === 'stone_rock') {
        // ================= CAUCASUS MOUNTAIN GRANITE BOULDER WITH MOSS (ქვის ლოდი) =================
        const p1x = obs.x + 8, p1y = obs.y + 10;
        const p2x = obs.x + obs.width * 0.45, p2y = obs.y + 1;
        const p3x = obs.x + obs.width - 6, p3y = obs.y + 12;
        const p4x = obs.x + obs.width, p4y = obs.y + obs.height - 4;
        const p5x = obs.x + obs.width * 0.5, p5y = obs.y + obs.height;
        const p6x = obs.x + 2, p6y = obs.y + obs.height - 6;

        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.lineTo(p4x, p4y);
        ctx.lineTo(p5x, p5y);
        ctx.lineTo(p6x, p6y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0C0A09';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#57534E';
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(obs.x + obs.width * 0.48, obs.y + obs.height * 0.55);
        ctx.lineTo(p6x, p6y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#78716C';
        ctx.beginPath();
        ctx.moveTo(p1x + 4, p1y + 2);
        ctx.lineTo(p2x, p2y + 2);
        ctx.lineTo(obs.x + obs.width * 0.45, obs.y + obs.height * 0.35);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p2x - 4, p2y + 6);
        ctx.lineTo(p2x + 12, p2y + 18);
        ctx.lineTo(p2x + 6, p2y + 26);
        ctx.stroke();

        ctx.fillStyle = '#15803D';
        ctx.beginPath();
        ctx.roundRect(p2x - 14, p2y + 1, 28, 8, [6, 6, 2, 2]);
        ctx.fill();
        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(p2x - 10, p2y + 2, 18, 3);
      } else if (obs.type === 'wooden_fence') {
        // ================= AUTHENTIC GEORGIAN VILLAGE PICKET FENCE (ხის ღობე) =================
        const pickets = 4;
        const pW = obs.width / pickets;

        for (let p = 0; p < pickets; p++) {
          const px = obs.x + p * pW;

          ctx.fillStyle = '#451A03';
          ctx.fillRect(px + 1, obs.y + 6, pW - 2, obs.height - 6);

          const woodGrad = ctx.createLinearGradient(px, obs.y, px + pW, obs.y);
          woodGrad.addColorStop(0, '#78350F');
          woodGrad.addColorStop(0.5, '#B45309');
          woodGrad.addColorStop(1, '#92400E');

          ctx.fillStyle = woodGrad;
          ctx.fillRect(px + 2, obs.y + 8, pW - 4, obs.height - 8);

          ctx.beginPath();
          ctx.moveTo(px + 2, obs.y + 8);
          ctx.lineTo(px + pW / 2, obs.y);
          ctx.lineTo(px + pW - 2, obs.y + 8);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#451A03';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + pW / 2, obs.y + 12);
          ctx.lineTo(px + pW / 2, obs.y + obs.height - 4);
          ctx.stroke();
          if (p % 2 === 0) {
            ctx.fillStyle = '#451A03';
            ctx.beginPath();
            ctx.arc(px + pW / 2, obs.y + 28, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = '#78350F';
        ctx.fillRect(obs.x, obs.y + 18, obs.width, 7);
        ctx.fillRect(obs.x, obs.y + obs.height - 18, obs.width, 7);
        ctx.strokeStyle = '#291104';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x, obs.y + 18, obs.width, 7);
        ctx.strokeRect(obs.x, obs.y + obs.height - 18, obs.width, 7);

        for (let p = 0; p < pickets; p++) {
          const px = obs.x + p * pW + pW / 2;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(px - 1.5, obs.y + 20, 3, 3);
          ctx.fillRect(px - 1.5, obs.y + obs.height - 16, 3, 3);
        }
      } else if (obs.type === 'crate') {
        // ================= HEAVY REINFORCED FREIGHT CRATE (ხის ყუთი) =================
        const crateGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
        crateGrad.addColorStop(0, '#D97706');
        crateGrad.addColorStop(1, '#92400E');
        ctx.fillStyle = crateGrad;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1.5;
        const bH = obs.height / 4;
        for (let b = 1; b < 4; b++) {
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + b * bH);
          ctx.lineTo(obs.x + obs.width, obs.y + b * bH);
          ctx.stroke();
        }

        ctx.strokeStyle = '#451A03';
        ctx.lineWidth = 4;
        ctx.strokeRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);

        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(obs.x + 4, obs.y + 4);
        ctx.lineTo(obs.x + obs.width - 4, obs.y + obs.height - 4);
        ctx.moveTo(obs.x + obs.width - 4, obs.y + 4);
        ctx.lineTo(obs.x + 4, obs.y + obs.height - 4);
        ctx.stroke();

        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(obs.x + 4, obs.y + 4);
        ctx.lineTo(obs.x + obs.width - 4, obs.y + obs.height - 4);
        ctx.moveTo(obs.x + obs.width - 4, obs.y + 4);
        ctx.lineTo(obs.x + 4, obs.y + obs.height - 4);
        ctx.stroke();

        ctx.fillStyle = '#1C1917';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TBS ★ 1989', obs.x + obs.width / 2, obs.y + obs.height / 2 + 3);

        const corners = [
          [obs.x, obs.y],
          [obs.x + obs.width - 8, obs.y],
          [obs.x, obs.y + obs.height - 8],
          [obs.x + obs.width - 8, obs.y + obs.height - 8],
        ];
        corners.forEach(([kx, ky]) => {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(kx, ky, 8, 8);
          ctx.fillStyle = '#94A3B8';
          ctx.fillRect(kx + 2, ky + 2, 4, 4);
        });
      } else if (obs.type === 'flying_toilet' || obs.type === 'low_beam') {
        // ================= FLYING JET TOILET (მფრინავი ტუალეტი) =================
        // Dynamic hovering bobbing oscillation
        const t = performance.now() * 0.007;
        const bob = Math.sin(t + obs.id * 1.5) * 4;
        const fx = obs.x;
        const fy = obs.y + bob;
        const fw = obs.width;
        const fh = obs.height;

        // 1. Red downward holographic danger laser beams down to the ground
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(fx + 16, fy + fh);
        ctx.lineTo(fx + 16, fy + fh + 65);
        ctx.moveTo(fx + fw - 16, fy + fh);
        ctx.lineTo(fx + fw - 16, fy + fh + 65);
        ctx.stroke();
        ctx.setLineDash([]);

        // Holographic warning badge
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼ ჩაცურდი! / SLIDE ▼', fx + fw / 2, fy + fh + 32);

        // 2. High-speed trailing toilet paper ribbon fluttering behind in the wind
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5;
        const wave1 = Math.sin(t * 4 + 1) * 5;
        const wave2 = Math.cos(t * 4.5 + 2) * 4;
        ctx.beginPath();
        ctx.moveTo(fx + 8, fy + 16);
        ctx.bezierCurveTo(fx - 14, fy + 12 + wave1, fx - 30, fy + 22 + wave2, fx - 45, fy + 16 + wave1);
        ctx.lineTo(fx - 45, fy + 26 + wave1);
        ctx.bezierCurveTo(fx - 30, fy + 32 + wave2, fx - 14, fy + 22 + wave1, fx + 8, fy + 26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Paper perforations
        ctx.strokeStyle = '#94A3B8';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(fx - 22, fy + 15 + wave1 * 0.7);
        ctx.lineTo(fx - 22, fy + 27 + wave1 * 0.7);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Dual Rocket Jet Thrusters (Side mounts)
        const thrusterPositions = [
          { x: fx + 4, y: fy + fh - 20 },
          { x: fx + fw - 20, y: fy + fh - 18 },
        ];

        thrusterPositions.forEach((th, idx) => {
          // Thruster metallic casing
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.roundRect(th.x - 2, th.y, 16, 12, 3);
          ctx.fill();
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Exhaust nozzle ring
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(th.x - 4, th.y + 2, 3, 8);

          // Roaring rocket flames (pulsating animated cones)
          const flameLen = 16 + Math.sin(t * 9 + idx * 2.5) * 7 + Math.random() * 4;
          // Outer orange flame
          ctx.fillStyle = '#F97316';
          ctx.beginPath();
          ctx.moveTo(th.x - 4, th.y + 1);
          ctx.lineTo(th.x - 4 - flameLen, th.y + 6);
          ctx.lineTo(th.x - 4, th.y + 11);
          ctx.closePath();
          ctx.fill();

          // Inner white-hot yellow core
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.moveTo(th.x - 4, th.y + 3);
          ctx.lineTo(th.x - 4 - flameLen * 0.6, th.y + 6);
          ctx.lineTo(th.x - 4, th.y + 9);
          ctx.closePath();
          ctx.fill();

          // Jet engine blue plasma spark
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.arc(th.x - 4, th.y + 6, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        // 4. Porcelain Water Cistern / Tank (Rear left)
        const tankX = fx + 16;
        const tankY = fy + 4;
        const tankW = 24;
        const tankH = 34;

        // Cistern porcelain body
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.roundRect(tankX, tankY, tankW, tankH, [6, 6, 2, 2]);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(tankX + 2, tankY + 2, tankW - 5, tankH - 4);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(tankX, tankY, tankW, tankH);

        // Cistern top lid bevel
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.roundRect(tankX - 2, tankY - 3, tankW + 4, 6, 3);
        ctx.fill();
        ctx.stroke();

        // Polished Chrome Flush Lever Handle
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(tankX - 4, tankY + 6, 4, 3);
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.roundRect(tankX - 8, tankY + 6, 5, 8, 2);
        ctx.fill();
        ctx.stroke();

        // 5. Porcelain Toilet Bowl & Pedestal
        const bowlX = fx + 32;
        const bowlY = fy + 14;
        const bowlW = 46;
        const bowlH = 26;

        // Bowl ceramic body
        const bowlGrad = ctx.createLinearGradient(bowlX, bowlY, bowlX, bowlY + bowlH);
        bowlGrad.addColorStop(0, '#FFFFFF');
        bowlGrad.addColorStop(0.7, '#F1F5F9');
        bowlGrad.addColorStop(1, '#CBD5E1');

        ctx.fillStyle = bowlGrad;
        ctx.beginPath();
        ctx.ellipse(bowlX + bowlW / 2, bowlY + bowlH / 2 + 2, bowlW / 2, bowlH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ceramic pedestal base connection
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(bowlX + 10, bowlY + bowlH);
        ctx.lineTo(bowlX + bowlW - 12, bowlY + bowlH);
        ctx.lineTo(bowlX + bowlW - 16, bowlY + bowlH + 8);
        ctx.lineTo(bowlX + 14, bowlY + bowlH + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Toilet bowl interior: Clean sparkling blue swirling water
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.ellipse(bowlX + bowlW * 0.52, bowlY + bowlH * 0.44, bowlW * 0.36, bowlH * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Swirling water foam & reflection
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.ellipse(bowlX + bowlW * 0.52, bowlY + bowlH * 0.42, bowlW * 0.28, bowlH * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bowlX + bowlW * 0.56, bowlY + bowlH * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();

        // 6. Upright Opened Toilet Lid & Ring
        ctx.fillStyle = '#F8FAFC';
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bowlX + 2, fy + 2, 8, 22, 3);
        ctx.fill();
        ctx.stroke();

        // Speed aerodynamic badge on bowl
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('JET-WC', bowlX + bowlW / 2, bowlY + bowlH + 6);

        ctx.restore();
      }

      ctx.restore();
    }
  }

  private renderDog() {
    const ctx = this.ctx;
    const chaser = this.dog; // Curly-haired guy with glasses!

    ctx.save();

    // Drop shadow under chaser on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(chaser.x + chaser.width / 2, chaser.y + chaser.height + 2, chaser.width * 0.42, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Check if chaser frames are loaded
    let frame: HTMLCanvasElement | null = null;
    if (chaser.isSlipped && spriteCache.chaserDamage && spriteCache.chaserDamage.width > 0) {
      frame = spriteCache.chaserDamage;
    } else if (spriteCache.dogFrames.length > 0) {
      frame = spriteCache.dogFrames[chaser.currentFrame % spriteCache.dogFrames.length];
    }

    if (frame && frame.width > 0 && frame.height > 0) {
      // Red pursuit aura if close to player
      if (this.stats.dogDistance < 100) {
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 14;
      }

      // Draw human chaser sprite aligned with running ground
      ctx.drawImage(frame, chaser.x - 12, chaser.y - 10, chaser.width + 24, chaser.height + 20);
    } else {
      this.drawProceduralChaser(chaser);
    }

    // Comic Speech Bubble with Georgian Shout
    if (chaser.isBarking) {
      const bubbleText = chaser.shoutText || 'მოგდევ!';
      ctx.font = 'bold 12px sans-serif';
      const textW = Math.max(75, ctx.measureText(bubbleText).width + 18);

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.roundRect(chaser.x + chaser.width * 0.4, chaser.y - 38, textW, 28, 8);
      ctx.fill();
      ctx.stroke();

      // Tail pointer to mouth
      ctx.beginPath();
      ctx.moveTo(chaser.x + chaser.width * 0.7, chaser.y - 10);
      ctx.lineTo(chaser.x + chaser.width * 0.6, chaser.y - 2);
      ctx.lineTo(chaser.x + chaser.width * 0.8, chaser.y - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#991B1B';
      ctx.textAlign = 'center';
      ctx.fillText(bubbleText, chaser.x + chaser.width * 0.4 + textW / 2, chaser.y - 19);
    }

    ctx.restore();
  }

  private renderPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();

    // 1. Drop shadow on ground under player
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    const shadowW = p.isSliding ? p.width * 1.2 : p.width * 0.85;
    const shadowY = p.y + p.height + 2;
    ctx.ellipse(p.x + p.width / 2, shadowY, shadowW / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stumble / Invincibility flicker
    if (p.invincibleTimer > 0) {
      const flicker = Math.floor(p.invincibleTimer * 20) % 2 === 0;
      if (flicker) {
        ctx.globalAlpha = 0.5;
      }
    }

    // Distinctive Skin Glowing Aura & Trail
    if (this.selectedSkin === 'cyberpunk') {
      ctx.shadowColor = '#22D3EE';
      ctx.shadowBlur = 14;
    } else if (this.selectedSkin === 'vip') {
      ctx.shadowColor = '#FACC15';
      ctx.shadowBlur = 16;
    } else if (this.selectedSkin === 'new_year') {
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 12;
    } else if (this.selectedSkin === 'halloween') {
      ctx.shadowColor = '#A855F7';
      ctx.shadowBlur = 12;
    } else if (this.selectedSkin === 'summer') {
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 10;
    } else if (this.selectedSkin === 'chokha') {
      ctx.shadowColor = '#E2E8F0';
      ctx.shadowBlur = 10;
    } else if (this.selectedSkin === 'svaneti') {
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 10;
    } else if (this.selectedSkin === 'taxi') {
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 10;
    }

    // Shield Aura if active
    if (this.activePowerUps.has('shield')) {
      ctx.save();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#0284C7';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.ellipse(
        p.x + p.width / 2,
        p.y + p.height / 2,
        p.width * 0.75,
        p.height * 0.65,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // Magnet Attraction Aura if active (visible tight arcade radius)
    if (this.activePowerUps.has('magnet') || (this.stats.feverTimer && this.stats.feverTimer > 0)) {
      ctx.save();
      const t = performance.now() * 0.001;
      const pulse = Math.sin(t * 7) * 4;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 70 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Magnetic flux sparks
      ctx.fillStyle = '#38BDF8';
      const sparkAngle = t * 4.5;
      for (let s = 0; s < 3; s++) {
        const sa = sparkAngle + (s * Math.PI * 2) / 3;
        const sx = p.x + p.width / 2 + Math.cos(sa) * (62 + pulse);
        const sy = p.y + p.height / 2 + Math.sin(sa) * (48 + pulse * 0.7);
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      ctx.restore();
    }

    // Select sprite frame
    let frame: HTMLCanvasElement | null = null;
    let isSlideSprite = false;

    if (p.isSliding) {
      if (spriteCache.playerSlideFrames && spriteCache.playerSlideFrames.length > 0) {
        const frameIdx = p.currentSlideFrame % spriteCache.playerSlideFrames.length;
        frame = spriteCache.playerSlideFrames[frameIdx];
        isSlideSprite = true;
      } else if (spriteCache.playerSlide && spriteCache.playerSlide.width > 0) {
        frame = spriteCache.playerSlide;
      }
    } else if (!p.isGrounded && spriteCache.playerJump && spriteCache.playerJump.width > 0) {
      frame = spriteCache.playerJump;
    } else if (spriteCache.playerFrames.length > 0) {
      frame = spriteCache.playerFrames[p.currentFrame % spriteCache.playerFrames.length];
    }

    const isCustomSkin = this.selectedSkin !== 'classic';

    if (!isCustomSkin && frame && frame.width > 0 && frame.height > 0) {
      if (isSlideSprite) {
        // Dynamic grounding & somersault roll physics for Kote
        const groundContactY = p.y + p.height;
        const drawH = p.baseHeight + 16;
        const drawW = Math.round((drawH * 140) / 155);
        const drawX = p.x + (p.width - drawW) / 2;
        const drawY = groundContactY - drawH + 8;

        // Dynamic forward momentum roll rotation on somersault tuck frames
        const frameIdx = p.currentSlideFrame % (spriteCache.playerSlideFrames?.length || 6);
        const rollTuckAngles = [0, 0.06, 0.18, 0.35, 0.24, 0.08];
        const rot = rollTuckAngles[frameIdx] || 0;

        if (rot !== 0) {
          ctx.save();
          ctx.translate(drawX + drawW / 2, drawY + drawH * 0.65);
          ctx.rotate(rot);
          ctx.drawImage(frame, -drawW / 2, -drawH * 0.65, drawW, drawH);
          ctx.restore();
        } else {
          ctx.drawImage(frame, drawX, drawY, drawW, drawH);
        }
      } else {
        // Standard running / jumping frame
        ctx.drawImage(frame, p.x - 14, p.y - 12, p.width + 28, p.height + 24);
      }
    } else {
      // High-quality procedural runner with selected custom skin outfit!
      this.drawProceduralPlayer(p);
    }

    ctx.restore();
  }

  private drawProceduralPlayer(p: Player) {
    const ctx = this.ctx;
    const skin = this.selectedSkin;
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

    if (p.isSliding) {
      ctx.scale(1.2, 0.55);
      ctx.rotate(-0.15);
    }

    // Legs animation
    const runCycle = Math.sin(p.runFrameTimer * 2 * Math.PI);
    const legOffset = p.isGrounded ? runCycle * 14 : -10;

    // --- 1. PANTS & SHOES PALETTE PER SKIN ---
    let pantsColor = '#18181B';
    let shoeColor = '#FFFFFF';
    let shoeAccent = '#2563EB';

    if (skin === 'new_year') {
      pantsColor = '#1E3A8A';
      shoeColor = '#991B1B';
      shoeAccent = '#FEF08A';
    } else if (skin === 'halloween') {
      pantsColor = '#18181B';
      shoeColor = '#7C2D12';
      shoeAccent = '#F97316';
    } else if (skin === 'summer') {
      pantsColor = '#0284C7'; // swimming trunks
      shoeColor = '#F59E0B'; // beach sandals
      shoeAccent = '#0284C7';
    } else if (skin === 'chokha') {
      pantsColor = '#0F172A';
      shoeColor = '#1E293B';
      shoeAccent = '#CBD5E1';
    } else if (skin === 'cyberpunk') {
      pantsColor = '#09090B';
      shoeColor = '#06B6D4';
      shoeAccent = '#EC4899';
    } else if (skin === 'taxi') {
      pantsColor = '#334155';
      shoeColor = '#78350F';
      shoeAccent = '#D97706';
    } else if (skin === 'svaneti') {
      pantsColor = '#1E293B';
      shoeColor = '#475569';
      shoeAccent = '#EA580C';
    } else if (skin === 'vip') {
      pantsColor = '#09090B';
      shoeColor = '#18181B';
      shoeAccent = '#FBBF24';
    }

    // Legs / Pants (or shorts if summer)
    ctx.fillStyle = pantsColor;
    const legLen = skin === 'summer' ? 22 : 34;
    ctx.fillRect(-14 + legOffset * 0.4, 12, 10, legLen);
    ctx.fillRect(4 - legOffset * 0.4, 12, 10, legLen);

    // If summer, draw bare tanned legs between shorts and sandals
    if (skin === 'summer') {
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(-13 + legOffset * 0.4, 34, 8, 10);
      ctx.fillRect(5 - legOffset * 0.4, 34, 8, 10);
    }

    // Shoes
    ctx.fillStyle = shoeColor;
    ctx.fillRect(-16 + legOffset * 0.4, 44, 14, 8);
    ctx.fillRect(2 - legOffset * 0.4, 44, 14, 8);
    ctx.fillStyle = shoeAccent;
    ctx.fillRect(-16 + legOffset * 0.4, 49, 14, 3);
    ctx.fillRect(2 - legOffset * 0.4, 49, 14, 3);

    // --- 2. TORSO / OUTFIT PER SKIN ---
    let torsoColor = '#18181B';
    let drapeColor = '#09090B';
    let drapeAccent = '#FFFFFF';
    let batonColor = '#2563EB';

    if (skin === 'new_year') {
      torsoColor = '#DC2626'; // festive red holiday sweater
      drapeColor = '#15803D'; // emerald green holiday scarf
      drapeAccent = '#FEF08A';
      batonColor = '#EF4444'; // candy cane baton
    } else if (skin === 'halloween') {
      torsoColor = '#3B0764'; // dark gothic purple
      drapeColor = '#18181B'; // batwing capelet
      drapeAccent = '#F97316'; // glowing seams
      batonColor = '#F97316'; // jack-o-lantern
    } else if (skin === 'summer') {
      torsoColor = '#06B6D4'; // turquoise Hawaiian shirt
      drapeColor = '#0891B2';
      drapeAccent = '#F43F5E';
      batonColor = '#FACC15'; // chilled lemonade
    } else if (skin === 'chokha') {
      torsoColor = '#0F172A'; // midnight black chokha
      drapeColor = '#1E293B';
      drapeAccent = '#CBD5E1'; // silver embroidery
      batonColor = '#E2E8F0'; // silver khanjali dagger
    } else if (skin === 'cyberpunk') {
      torsoColor = '#09090B'; // techwear matte black
      drapeColor = '#1E1B4B';
      drapeAccent = '#22D3EE'; // neon circuits
      batonColor = '#22D3EE'; // cyan laser baton
    } else if (skin === 'taxi') {
      torsoColor = '#F8FAFC'; // white polo
      drapeColor = '#78350F'; // vintage leather vest
      drapeAccent = '#B45309';
      batonColor = '#F59E0B'; // car remote key
    } else if (skin === 'svaneti') {
      torsoColor = '#EA580C'; // orange arctic jacket
      drapeColor = '#1E293B'; // Svaneti pattern scarf
      drapeAccent = '#FFFFFF';
      batonColor = '#94A3B8'; // climbing pick
    } else if (skin === 'vip') {
      torsoColor = '#09090B'; // black tuxedo
      drapeColor = '#1C1917';
      drapeAccent = '#FACC15'; // 24K gold lapels
      batonColor = '#F59E0B'; // gold ingot baton
    }

    // Torso Base
    ctx.fillStyle = torsoColor;
    ctx.beginPath();
    ctx.roundRect(-16, -20, 32, 34, 5);
    ctx.fill();

    // Specific torso patterns
    if (skin === 'new_year') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-10, -10, 5, 2);
      ctx.fillRect(-8, -12, 2, 5);
      ctx.fillRect(5, -10, 5, 2);
      ctx.fillRect(7, -12, 2, 5);
      ctx.fillStyle = '#15803D';
      ctx.fillRect(-16, 6, 32, 4);
    } else if (skin === 'halloween') {
      ctx.fillStyle = '#F97316';
      ctx.fillRect(-8, -8, 4, 3);
      ctx.fillRect(4, -8, 4, 3);
      ctx.beginPath();
      ctx.moveTo(-7, 2); ctx.lineTo(-3, 5); ctx.lineTo(0, 2); ctx.lineTo(3, 5); ctx.lineTo(7, 2);
      ctx.stroke();
    } else if (skin === 'summer') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-5, -20); ctx.lineTo(5, -20); ctx.lineTo(0, -10); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(-8, -2, 3, 3);
      ctx.fillRect(6, 4, 3, 3);
    } else if (skin === 'chokha') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-6, -20); ctx.lineTo(6, -20); ctx.lineTo(0, -6); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#E2E8F0';
      for (let m = 0; m < 4; m++) {
        ctx.fillRect(-14 + m * 3, -12, 2, 7);
        ctx.fillRect(4 + m * 3, -12, 2, 7);
      }
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(-16, 6, 32, 4);
    } else if (skin === 'cyberpunk') {
      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, -14); ctx.lineTo(-4, -6); ctx.lineTo(-4, 4);
      ctx.moveTo(12, -14); ctx.lineTo(4, -6); ctx.lineTo(4, 4);
      ctx.stroke();
      ctx.fillStyle = '#EC4899';
      ctx.fillRect(-2, -4, 4, 4);
    } else if (skin === 'taxi') {
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-16, -20, 8, 34);
      ctx.fillRect(8, -20, 8, 34);
    } else if (skin === 'svaneti') {
      ctx.strokeStyle = '#9A3412';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-16, -8); ctx.lineTo(16, -8);
      ctx.moveTo(-16, 2); ctx.lineTo(16, 2);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-3, -4, 6, 2);
      ctx.fillRect(-1, -6, 2, 6);
    } else if (skin === 'vip') {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(-13, -20); ctx.lineTo(-3, -2); ctx.lineTo(-8, 8); ctx.closePath();
      ctx.moveTo(13, -20); ctx.lineTo(3, -2); ctx.lineTo(8, 8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-3, -20, 6, 2);
    }

    // Draped sweater sleeves / scarf over shoulders
    ctx.fillStyle = drapeColor;
    ctx.beginPath();
    ctx.moveTo(-18, -20);
    ctx.quadraticCurveTo(-12, 4, -6, 14);
    ctx.lineTo(-2, 14);
    ctx.quadraticCurveTo(-8, 2, -10, -20);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(18, -20);
    ctx.quadraticCurveTo(12, 4, 6, 14);
    ctx.lineTo(2, 14);
    ctx.quadraticCurveTo(8, 2, 10, -20);
    ctx.fill();

    // Shoulder drape accent lines
    ctx.strokeStyle = drapeAccent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-14, -18); ctx.quadraticCurveTo(-10, 2, -4, 12);
    ctx.moveTo(14, -18); ctx.quadraticCurveTo(10, 2, 4, 12);
    ctx.stroke();

    // --- 3. HEAD & FACE: 100% UNTOUCHED AUTHENTIC KOTE ("სახე არ შეცვალო"!) ---
    // Neck
    ctx.fillStyle = '#D97706';
    ctx.fillRect(-5, -24, 10, 6);

    // Face
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.roundRect(-13, -50, 26, 28, 7);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#451A03';
    ctx.fillRect(-9, -40, 4, 3);
    ctx.fillRect(5, -40, 4, 3);

    // Determined Smile
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -31, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Dark hair & bangs
    ctx.fillStyle = '#1C1917';
    ctx.beginPath();
    ctx.roundRect(-15, -58, 30, 14, [8, 8, 2, 2]);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-15, -47); ctx.lineTo(-3, -42); ctx.lineTo(5, -47); ctx.lineTo(13, -44); ctx.lineTo(15, -50); ctx.lineTo(-15, -50);
    ctx.closePath();
    ctx.fill();

    // Baton / Item in hand
    ctx.fillStyle = batonColor;
    ctx.fillRect(12, 0, 14, 6);

    ctx.restore();
  }

  private drawProceduralChaser(chaser: ChasingDog) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(chaser.x + chaser.width / 2, chaser.y + chaser.height / 2);

    const legSwing = Math.sin(chaser.frameTimer * 2 * Math.PI) * 12;

    // Dark jeans
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-12 + legSwing * 0.4, 12, 8, 34);
    ctx.fillRect(4 - legSwing * 0.4, 12, 8, 34);

    // Black shoes
    ctx.fillStyle = '#09090B';
    ctx.fillRect(-14 + legSwing * 0.4, 44, 12, 8);
    ctx.fillRect(2 - legSwing * 0.4, 44, 12, 8);

    // Black shirt
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.roundRect(-16, -18, 32, 32, 4);
    ctx.fill();

    // Face
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.roundRect(-12, -46, 24, 26, 6);
    ctx.fill();

    // Glasses
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -38, 8, 6);
    ctx.strokeRect(2, -38, 8, 6);
    ctx.beginPath();
    ctx.moveTo(-2, -35);
    ctx.lineTo(2, -35);
    ctx.stroke();

    // Curly hair
    ctx.fillStyle = '#18181B';
    for (let angle = 0; angle < Math.PI * 2; angle += 0.6) {
      const cx = Math.cos(angle) * 14;
      const cy = -46 + Math.sin(angle) * 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderWeather() {
    const ctx = this.ctx;
    const level = this.currentLevelIndex + 1;

    for (const p of this.weatherParticles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (level === 5 || p.type === 'rain') {
        // Rain streak
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-6, 14);
        ctx.stroke();
      } else if (p.type === 'spark') {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.fillRect(-2, -2, p.size, p.size);
      } else {
        // Autumn golden leaf
        ctx.fillStyle = p.color || '#F59E0B';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderProjectiles() {
    const ctx = this.ctx;

    for (const proj of this.projectiles) {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(proj.rotation);

      if (proj.vx < 0) {
        // Banana peel trap thrown by player
        if (spriteCache.boneIcon && spriteCache.boneIcon.width > 0) {
          ctx.drawImage(spriteCache.boneIcon, -18, -18, 36, 36);
        } else {
          ctx.fillStyle = '#FBBF24';
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        // Projectile thrown by chaser towards player
        ctx.fillStyle = '#854D0E';
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-12, -12, 24, 24, 4);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderFloatingTexts() {
    const ctx = this.ctx;

    for (const ft of this.floatingTexts) {
      ctx.save();
      const progress = ft.life / ft.maxLife;
      const alpha = Math.max(0, 1 - progress);
      ctx.globalAlpha = alpha;

      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';

      // Outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);

      // Fill text
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);

      ctx.restore();
    }
  }

  private renderParticles() {
    const ctx = this.ctx;

    for (const part of this.particles) {
      ctx.save();
      ctx.globalAlpha = part.alpha;

      if (part.shape === 'spark') {
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, part.size, part.size * 0.5);
      } else if (part.shape === 'smoke') {
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (part.shape === 'bark') {
        // Curved sonic wave
        ctx.strokeStyle = part.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size + part.life * 40, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();
      } else {
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
