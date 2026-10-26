/**
 * Sprite Loader and Transparent Keying Cache
 * Preprocesses Kote runner, curly-haired chaser, and Georgian village assets.
 * Includes immediate high-definition procedural fallbacks so characters are NEVER blank or invisible.
 */

export interface CachedSpriteSheet {
  playerFrames: HTMLCanvasElement[];
  playerJump: HTMLCanvasElement;
  playerSlide: HTMLCanvasElement;
  playerSlideFrames: HTMLCanvasElement[];
  playerPortrait: HTMLCanvasElement;
  dogFrames: HTMLCanvasElement[];
  chaserPortrait: HTMLCanvasElement;
  chaserDamage: HTMLCanvasElement;
  chaserJump: HTMLCanvasElement;
  coinFrames: HTMLCanvasElement[];
  magnetIcon: HTMLCanvasElement;
  speedIcon: HTMLCanvasElement;
  shieldIcon: HTMLCanvasElement;
  boneIcon: HTMLCanvasElement;
  bgImage: HTMLImageElement | null;
  isLoaded: boolean;
}

import { CharacterSkin } from '../types/game';

// ------------------ PROCEDURAL FALLBACK GENERATORS ------------------
// Creates a stylized Georgian pixel-art runner (Kote) holding baton/accessory
export function createProceduralPlayerCanvas(
  pose: 'run1' | 'run2' | 'run3' | 'run4' | 'run5' | 'run6' | 'jump' | 'slide' | 'portrait',
  skin: CharacterSkin = 'classic'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = 140;
  const h = 155;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(w / 2, h / 2);

  if (pose === 'slide') {
    ctx.scale(1.2, 0.55);
    ctx.rotate(-0.15);
  }

  // Shadow at base
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 64, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const legOffset =
    pose === 'run1' ? -18 :
    pose === 'run2' ? -10 :
    pose === 'run3' ? 0 :
    pose === 'run4' ? 12 :
    pose === 'run5' ? 20 :
    pose === 'jump' ? -14 : 0;

  // --- 1. LEGS & PANTS PER SKIN ---
  let pantsColor = '#18181B';
  let shoeColor = '#F8FAFC';
  let shoeAccent = '#0F172A';

  if (skin === 'new_year') {
    pantsColor = '#14532D'; // festive evergreen green
    shoeColor = '#7F1D1D'; // holiday winter boots
    shoeAccent = '#FFFFFF';
  } else if (skin === 'halloween') {
    pantsColor = '#2E1065'; // dark midnight purple
    shoeColor = '#581C87';
    shoeAccent = '#F97316'; // orange laces
  } else if (skin === 'summer') {
    pantsColor = '#D4A373'; // khaki beige beach shorts
    shoeColor = '#06B6D4'; // teal slip-ons
    shoeAccent = '#FDE047';
  } else if (skin === 'chokha') {
    pantsColor = '#0F172A'; // midnight black chokha sharvari
    shoeColor = '#1C1917'; // Georgian leather boots
    shoeAccent = '#475569';
  } else if (skin === 'cyberpunk') {
    pantsColor = '#0B0F19'; // dark techwear
    shoeColor = '#0F172A';
    shoeAccent = '#22D3EE'; // neon cyan glowing soles
  } else if (skin === 'taxi') {
    pantsColor = '#1D4ED8'; // classic denim blue jeans
    shoeColor = '#92400E'; // retro brown loafers
    shoeAccent = '#451A03';
  } else if (skin === 'svaneti') {
    pantsColor = '#4B5563'; // heavy grey thermal snow pants
    shoeColor = '#1F2937';
    shoeAccent = '#EA580C'; // orange straps
  } else if (skin === 'vip') {
    pantsColor = '#09090B'; // black tuxedo pants
    shoeColor = '#18181B';
    shoeAccent = '#FBBF24'; // pure gold buckles
  }

  // Pants (or shorts if summer)
  ctx.fillStyle = pantsColor;
  const legLen = skin === 'summer' ? 24 : 38;
  ctx.beginPath();
  ctx.roundRect(-16 + legOffset * 0.4, 20, 12, legLen, 4);
  ctx.roundRect(4 - legOffset * 0.4, 20, 12, legLen, 4);
  ctx.fill();

  // If summer, draw bare tanned legs between shorts and shoes
  if (skin === 'summer') {
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-14 + legOffset * 0.4, 42, 8, 14);
    ctx.fillRect(6 - legOffset * 0.4, 42, 8, 14);
  }

  // Shoes
  ctx.fillStyle = shoeColor;
  ctx.beginPath();
  ctx.roundRect(-18 + legOffset * 0.4, 54, 18, 10, [2, 6, 2, 2]);
  ctx.roundRect(2 - legOffset * 0.4, 54, 18, 10, [2, 6, 2, 2]);
  ctx.fill();
  ctx.fillStyle = shoeAccent;
  ctx.fillRect(-18 + legOffset * 0.4, 61, 18, 3);
  ctx.fillRect(2 - legOffset * 0.4, 61, 18, 3);

  // --- 2. TORSO / OUTFIT PER SKIN ---
  let torsoColor = '#18181B';
  let drapeColor = '#09090B';
  let drapeAccent = '#FFFFFF';
  let batonColor = '#2563EB';

  if (skin === 'new_year') {
    torsoColor = '#DC2626'; // festive red holiday sweater
    drapeColor = '#15803D'; // emerald green holiday scarf
    drapeAccent = '#FEF08A';
    batonColor = '#EF4444'; // red candy cane
  } else if (skin === 'halloween') {
    torsoColor = '#3B0764'; // dark gothic purple
    drapeColor = '#18181B'; // batwing capelet
    drapeAccent = '#F97316'; // orange seams
    batonColor = '#F97316'; // glowing pumpkin
  } else if (skin === 'summer') {
    torsoColor = '#06B6D4'; // turquoise Hawaiian floral shirt
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
    drapeAccent = '#22D3EE'; // glowing cyan circuits
    batonColor = '#22D3EE'; // cyan laser baton
  } else if (skin === 'taxi') {
    torsoColor = '#F8FAFC'; // white polo
    drapeColor = '#78350F'; // vintage leather vest
    drapeAccent = '#B45309';
    batonColor = '#F59E0B'; // car remote key
  } else if (skin === 'svaneti') {
    torsoColor = '#EA580C'; // orange arctic down jacket
    drapeColor = '#1E293B'; // Svanetian pattern scarf
    drapeAccent = '#FFFFFF';
    batonColor = '#94A3B8'; // climbing axe
  } else if (skin === 'vip') {
    torsoColor = '#09090B'; // black tuxedo
    drapeColor = '#1C1917';
    drapeAccent = '#FACC15'; // 24K gold lapels
    batonColor = '#F59E0B'; // pure gold ingot baton
  }

  // Torso Base
  ctx.fillStyle = torsoColor;
  ctx.beginPath();
  ctx.roundRect(-20, -18, 40, 42, 6);
  ctx.fill();

  // Outfit specific details on Torso:
  if (skin === 'new_year') {
    // White knitted snowflakes on red sweater
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-12, -8, 6, 2);
    ctx.fillRect(-10, -10, 2, 6);
    ctx.fillRect(6, -8, 6, 2);
    ctx.fillRect(8, -10, 2, 6);
    ctx.fillRect(-2, 4, 4, 4);
    // Green holiday belt
    ctx.fillStyle = '#15803D';
    ctx.fillRect(-20, 16, 40, 5);
  } else if (skin === 'halloween') {
    // Glowing orange Jack-o'-lantern carved face on chest
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(-10, -6); ctx.lineTo(-6, -10); ctx.lineTo(-2, -6); ctx.closePath();
    ctx.moveTo(2, -6); ctx.lineTo(6, -10); ctx.lineTo(10, -6); ctx.closePath();
    ctx.moveTo(-11, 4); ctx.lineTo(-7, 7); ctx.lineTo(-3, 4); ctx.lineTo(0, 8);
    ctx.lineTo(3, 4); ctx.lineTo(7, 7); ctx.lineTo(11, 4);
    ctx.fill();
  } else if (skin === 'summer') {
    // White undershirt visible under open Hawaiian collar
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-6, -18); ctx.lineTo(6, -18); ctx.lineTo(0, -6); ctx.closePath();
    ctx.fill();
    // Colorful Hawaiian tropical hibiscus flowers
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.arc(-10, 4, 3.5, 0, Math.PI * 2);
    ctx.arc(10, -2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(-11, 3, 2, 2);
    ctx.fillRect(9, -3, 2, 2);
  } else if (skin === 'chokha') {
    // White Akhalukhi under chokha V-neck
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-7, -18); ctx.lineTo(7, -18); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fill();
    // Silver Cartridge holders (მასრები) on chest - 4 on each side
    ctx.fillStyle = '#E2E8F0';
    for (let m = 0; m < 4; m++) {
      ctx.fillRect(-18 + m * 3.5, -10, 2.5, 9);
      ctx.fillRect(5 + m * 3.5, -10, 2.5, 9);
    }
    // Silver Caucasian belt
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-20, 15, 40, 5);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-4, 14, 8, 7);
  } else if (skin === 'cyberpunk') {
    // Glowing neon cyan cybernetic circuit traces
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, -12); ctx.lineTo(-4, -4); ctx.lineTo(-4, 10);
    ctx.moveTo(14, -12); ctx.lineTo(4, -4); ctx.lineTo(4, 10);
    ctx.stroke();
    ctx.fillStyle = '#EC4899';
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (skin === 'taxi') {
    // Vintage brown leather vest over white polo
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-20, -18, 10, 42);
    ctx.fillRect(10, -18, 10, 42);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-11, -12, 2, 24);
    ctx.fillRect(9, -12, 2, 24);
  } else if (skin === 'svaneti') {
    // Arctic down jacket quilted baffles
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -6); ctx.lineTo(20, -6);
    ctx.moveTo(-20, 6); ctx.lineTo(20, 6);
    ctx.stroke();
    // Svaneti cross patch
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-4, -2, 8, 2);
    ctx.fillRect(-1, -5, 2, 8);
  } else if (skin === 'vip') {
    // Polished 24K gold lapels on black tuxedo
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(-16, -18); ctx.lineTo(-4, 4); ctx.lineTo(-10, 18); ctx.closePath();
    ctx.moveTo(16, -18); ctx.lineTo(4, 4); ctx.lineTo(10, 18); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-4, -18, 8, 3);
    ctx.fillRect(-2, -15, 4, 3);
  } else {
    // Classic stripes
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(-6, -4, 12, 3);
    ctx.fillRect(-4, 2, 8, 2);
  }

  // Draped sweater / scarf sleeves over shoulders
  ctx.fillStyle = drapeColor;
  ctx.beginPath();
  ctx.moveTo(-22, -18); ctx.quadraticCurveTo(-14, 12, -8, 22); ctx.lineTo(-2, 22); ctx.quadraticCurveTo(-8, 8, -12, -18); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(22, -18); ctx.quadraticCurveTo(14, 12, 8, 22); ctx.lineTo(2, 22); ctx.quadraticCurveTo(8, 8, 12, -18); ctx.closePath();
  ctx.fill();

  // Drape accent lines
  ctx.strokeStyle = drapeAccent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-16, -16); ctx.quadraticCurveTo(-11, 6, -5, 20);
  ctx.moveTo(16, -16); ctx.quadraticCurveTo(11, 6, 5, 20);
  ctx.stroke();

  // --- 3. HEAD & FACE: 100% UNTOUCHED AUTHENTIC KOTE ("სახე არ შეცვალო"!) ---
  ctx.fillStyle = '#D97706';
  ctx.fillRect(-6, -26, 12, 10); // Neck

  ctx.fillStyle = '#FBBF24';
  ctx.beginPath();
  ctx.roundRect(-16, -56, 32, 34, 10);
  ctx.fill(); // Face

  ctx.fillStyle = '#451A03';
  ctx.fillRect(-11, -44, 5, 4);
  ctx.fillRect(6, -44, 5, 4); // Eyes

  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -32, 6, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke(); // Determined smile

  ctx.fillStyle = '#1C1917';
  ctx.beginPath();
  ctx.roundRect(-18, -66, 36, 18, [12, 12, 2, 2]);
  ctx.fill(); // Stylish dark hair
  ctx.beginPath();
  ctx.moveTo(-18, -52); ctx.lineTo(-4, -46); ctx.lineTo(6, -52); ctx.lineTo(16, -48); ctx.lineTo(18, -56); ctx.lineTo(-18, -56);
  ctx.closePath();
  ctx.fill(); // Bangs

  // --- 4. ACCESSORY IN HAND ---
  ctx.fillStyle = batonColor;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(14, 6, 18, 7, 3);
  ctx.fill();
  ctx.stroke();

  // Special skin trail glow accents
  if (skin === 'new_year') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(16, 8, 4, 3);
    ctx.fillRect(24, 8, 4, 3);
  } else if (skin === 'halloween') {
    ctx.fillStyle = '#F97316';
    ctx.beginPath(); ctx.arc(23, 9, 3, 0, Math.PI * 2); ctx.fill();
  } else if (skin === 'vip') {
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(16, 5, 5, 2);
  }

  ctx.restore();
  return canvas;
}

// Procedural chaser (curly-haired guy with glasses in black shirt)
export function createProceduralChaserCanvas(
  pose: 'run1' | 'run2' | 'run3' | 'run4' | 'damage' | 'portrait'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = 120;
  const h = 155;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(w / 2, h / 2);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 64, 26, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs in dark jeans
  ctx.fillStyle = '#1E293B';
  const legSwing = pose === 'run1' ? -14 : pose === 'run2' ? 0 : pose === 'run3' ? 14 : 0;
  ctx.fillRect(-14 + legSwing * 0.4, 22, 10, 36);
  ctx.fillRect(4 - legSwing * 0.4, 22, 10, 36);

  // Black sneakers
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-16 + legSwing * 0.4, 56, 16, 8);
  ctx.fillRect(2 - legSwing * 0.4, 56, 16, 8);

  // Black T-shirt with logo
  ctx.fillStyle = '#18181B';
  ctx.beginPath();
  ctx.roundRect(-18, -16, 36, 40, 5);
  ctx.fill();
  // White logo writing ("The Bottom")
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(-8, -2, 16, 3);

  // Face
  ctx.fillStyle = '#FCD34D';
  ctx.beginPath();
  ctx.roundRect(-15, -52, 30, 32, 8);
  ctx.fill();

  // Rectangular Glasses
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-12, -42, 10, 8);
  ctx.strokeRect(2, -42, 10, 8);
  ctx.beginPath();
  ctx.moveTo(-2, -38);
  ctx.lineTo(2, -38);
  ctx.stroke();

  // Eyes inside glasses
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(-8, -39, 3, 3);
  ctx.fillRect(6, -39, 3, 3);

  // Curly Black Afro / Curly Hair
  ctx.fillStyle = '#18181B';
  for (let angle = 0; angle < Math.PI * 2; angle += 0.5) {
    const cx = Math.cos(angle) * 16;
    const cy = -54 + Math.sin(angle) * 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth shouting or crying if damage
  if (pose === 'damage') {
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(0, -28, 5, 0, Math.PI);
    ctx.fill();
  } else {
    ctx.fillStyle = '#991B1B';
    ctx.fillRect(-4, -28, 8, 4);
  }

  ctx.restore();
  return canvas;
}

// Procedural trap / distraction gadget icon
export function createProceduralTrapIcon(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.translate(32, 32);

  // Banana peel / trap
  ctx.fillStyle = '#FBBF24';
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Peels curling out
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.quadraticCurveTo(-22, -10, -18, -18);
  ctx.lineTo(-12, -14);
  ctx.quadraticCurveTo(-15, -4, -6, 4);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(10, 4);
  ctx.quadraticCurveTo(22, -10, 18, -18);
  ctx.lineTo(12, -14);
  ctx.quadraticCurveTo(15, -4, 6, 4);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
  return canvas;
}

// Procedural Horseshoe Magnet Icon with magnetic aura and metallic poles
export function createProceduralMagnetIcon(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(32, 32);

  // Magnetic field glow rings
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -4, 25, Math.PI * 0.9, Math.PI * 2.1);
  ctx.stroke();

  // U-shape Magnet Body
  ctx.lineWidth = 10;
  ctx.lineCap = 'butt';

  // Red Left Arm (North)
  ctx.strokeStyle = '#DC2626';
  ctx.beginPath();
  ctx.arc(0, 0, 15, Math.PI * 0.75, Math.PI * 1.5);
  ctx.lineTo(-15, 12);
  ctx.stroke();

  // Blue Right Arm (South)
  ctx.strokeStyle = '#2563EB';
  ctx.beginPath();
  ctx.arc(0, 0, 15, -Math.PI * 0.5, Math.PI * 0.25);
  ctx.lineTo(15, 12);
  ctx.stroke();

  // Arch connection highlight
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 15, Math.PI * 1.05, Math.PI * 1.35);
  ctx.stroke();

  // Chrome Silver pole tips
  ctx.fillStyle = '#F1F5F9';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  // Left pole tip
  ctx.beginPath();
  ctx.roundRect(-20, 10, 10, 10, 2);
  ctx.fill();
  ctx.stroke();
  // Right pole tip
  ctx.beginPath();
  ctx.roundRect(10, 10, 10, 10, 2);
  ctx.fill();
  ctx.stroke();

  // Pole letter markings: N and S
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('N', -15, 6);
  ctx.fillText('S', 15, 6);

  // Sparks between poles
  ctx.fillStyle = '#FDE047';
  ctx.fillRect(-5, 14, 3, 3);
  ctx.fillRect(3, 14, 3, 3);
  ctx.fillRect(-1, 12, 3, 4);

  ctx.restore();
  return canvas;
}

// Procedural Sprint / Speed Lightning Icon
export function createProceduralSpeedIcon(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(32, 32);

  // Cyan nitro aura
  ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Angular double lightning bolt
  ctx.fillStyle = '#FBBF24';
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(4, -24);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-10, 24);
  ctx.lineTo(14, -2);
  ctx.lineTo(2, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner bright yellow highlight
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.moveTo(2, -20);
  ctx.lineTo(-10, -2);
  ctx.lineTo(-2, -2);
  ctx.lineTo(-6, 16);
  ctx.lineTo(10, -4);
  ctx.lineTo(2, -4);
  ctx.closePath();
  ctx.fill();

  // Speed lines behind bolt
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22, -12);
  ctx.lineTo(-14, -12);
  ctx.moveTo(-24, 0);
  ctx.lineTo(-16, 0);
  ctx.moveTo(-20, 12);
  ctx.lineTo(-12, 12);
  ctx.stroke();

  ctx.restore();
  return canvas;
}

// Procedural Georgian Knight Round Shield with Cross & Bronze Studs
export function createProceduralShieldIcon(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(32, 32);

  // Cyan protective shield aura
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 27, 0, Math.PI * 2);
  ctx.stroke();

  // Outer bronze rim
  ctx.fillStyle = '#B45309';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Steel shield body
  const grad = ctx.createLinearGradient(-18, -18, 18, 18);
  grad.addColorStop(0, '#64748B');
  grad.addColorStop(0.5, '#94A3B8');
  grad.addColorStop(1, '#475569');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Embossed Georgian Bolnisi Cross (ბოლნური ჯვარი) in ruby red
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#7F1D1D';
  ctx.lineWidth = 1.5;

  // Vertical beam with flared ends
  ctx.beginPath();
  ctx.moveTo(-4, -14);
  ctx.lineTo(4, -14);
  ctx.lineTo(2.5, -3);
  ctx.lineTo(2.5, 3);
  ctx.lineTo(4, 14);
  ctx.lineTo(-4, 14);
  ctx.lineTo(-2.5, 3);
  ctx.lineTo(-2.5, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Horizontal beam with flared ends
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(-3, -2.5);
  ctx.lineTo(3, -2.5);
  ctx.lineTo(14, -4);
  ctx.lineTo(14, 4);
  ctx.lineTo(3, 2.5);
  ctx.lineTo(-3, 2.5);
  ctx.lineTo(-14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden Center Boss Stud
  ctx.fillStyle = '#FDE047';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bronze rivets along outer rim
  ctx.fillStyle = '#F59E0B';
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const rx = Math.cos(a) * 21.5;
    const ry = Math.sin(a) * 21.5;
    ctx.beginPath();
    ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return canvas;
}

// Create slide canvas by squashing running pose
function createSlideCanvas(baseFrame: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = baseFrame.width || 140;
  const h = baseFrame.height || 155;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.translate(w * 0.1, h * 0.42);
  ctx.scale(1.15, 0.58);
  ctx.rotate(-0.16);
  ctx.drawImage(baseFrame, 0, 0);
  ctx.restore();

  return canvas;
}

// Procedural Animated Pixel-art Toilet Paper Roll
export function createProceduralToiletPaperCanvas(frameIdx: number = 0): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = 64;
  const h = 64;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(w / 2, h / 2);

  // Gentle float bobbing / wobbling
  const wave = Math.sin(frameIdx * Math.PI * 0.5) * 2;
  const flapWave = Math.sin(frameIdx * Math.PI * 0.5) * 5;

  // Soft drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Golden glowing halo
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, wave, 22, 0, Math.PI * 2);
  ctx.stroke();

  // Trailing paper tail / loose flap
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(8, -4 + wave);
  ctx.quadraticCurveTo(18 + flapWave, 6 + wave, 22 + flapWave, 18 + wave);
  ctx.lineTo(15 + flapWave, 20 + wave);
  ctx.quadraticCurveTo(10 + flapWave * 0.5, 8 + wave, 6, 8 + wave);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Perforated dotted line on the paper tail
  ctx.strokeStyle = '#94A3B8';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(10 + flapWave * 0.6, 12 + wave);
  ctx.lineTo(18 + flapWave * 0.6, 14 + wave);
  ctx.stroke();
  ctx.setLineDash([]);

  // Main Cylinder Body (white with subtle light grey shading)
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(-16, -14 + wave, 24, 28, [4, 4, 6, 6]);
  ctx.fill();

  // Cylinder left shade
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(-16, -14 + wave, 7, 28, [4, 0, 0, 6]);
  ctx.fill();

  // Body outline
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-16, -14 + wave, 24, 28);

  // Top Face of the Roll (perspective ellipse)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(-4, -14 + wave, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner cardboard tube opening (brown / dark center)
  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.ellipse(-4, -14 + wave, 5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center hollow depth
  ctx.fillStyle = '#1C1917';
  ctx.beginPath();
  ctx.ellipse(-4, -13 + wave, 2.5, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cute golden star / sparkle
  ctx.fillStyle = '#FBBF24';
  const starOffset = frameIdx % 2 === 0 ? -1 : 1;
  ctx.fillRect(-18 + starOffset * 2, -18 + wave, 3, 3);
  ctx.fillRect(-19 + starOffset * 2, -17 + wave, 5, 1);
  ctx.fillRect(16 - starOffset * 2, -10 + wave, 3, 3);

  ctx.restore();
  return canvas;
}

function createChaserDamageCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width || 120;
  canvas.height = source.height || 155;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-0.35); // slip lean
  ctx.drawImage(source, -canvas.width / 2, -canvas.height / 2);

  // Red flash tint
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  ctx.restore();

  return canvas;
}

// Initialized with valid procedural graphics so nothing is ever 0x0 or blank
export const spriteCache: CachedSpriteSheet = {
  playerFrames: [
    createProceduralPlayerCanvas('run1'),
    createProceduralPlayerCanvas('run2'),
    createProceduralPlayerCanvas('run3'),
    createProceduralPlayerCanvas('run4'),
    createProceduralPlayerCanvas('run5'),
    createProceduralPlayerCanvas('run6'),
  ],
  playerJump: createProceduralPlayerCanvas('jump'),
  playerSlide: createProceduralPlayerCanvas('slide'),
  playerSlideFrames: [
    createProceduralPlayerCanvas('slide'),
    createProceduralPlayerCanvas('slide'),
    createProceduralPlayerCanvas('slide'),
    createProceduralPlayerCanvas('slide'),
    createProceduralPlayerCanvas('slide'),
    createProceduralPlayerCanvas('slide'),
  ],
  playerPortrait: createProceduralPlayerCanvas('portrait'),
  dogFrames: [
    createProceduralChaserCanvas('run1'),
    createProceduralChaserCanvas('run2'),
    createProceduralChaserCanvas('run3'),
    createProceduralChaserCanvas('run4'),
  ],
  chaserPortrait: createProceduralChaserCanvas('portrait'),
  chaserDamage: createProceduralChaserCanvas('damage'),
  chaserJump: createProceduralChaserCanvas('run2'),
  coinFrames: [
    createProceduralToiletPaperCanvas(0),
    createProceduralToiletPaperCanvas(1),
    createProceduralToiletPaperCanvas(2),
    createProceduralToiletPaperCanvas(3),
  ],
  magnetIcon: createProceduralMagnetIcon(),
  speedIcon: createProceduralSpeedIcon(),
  shieldIcon: createProceduralShieldIcon(),
  boneIcon: createProceduralTrapIcon(),
  bgImage: null,
  isLoaded: false,
};

// Safe image loader without crossOrigin='anonymous' on local paths
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// High-fidelity Chroma Key Background Remover
function extractFrameWithChromaKey(
  sourceImg: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetW: number,
  targetH: number,
  keyType: 'player' | 'chaser' | 'dark' | 'crouch'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, targetW, targetH);

  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const px = (i / 4) % targetW;
    const py = Math.floor((i / 4) / targetW);

    if (keyType === 'player') {
      // Clear corner frame number annotation (top-left 14%)
      if (px < targetW * 0.14 && py < targetH * 0.14) {
        data[i + 3] = 0;
        continue;
      }

      // Check for light grey / blueprint / grid background
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const diff = maxVal - minVal;

      // In the spritesheet, the background is light grey/grid (minVal > 150, diff < 38)
      // or grid line (minVal > 120, diff < 22)
      if (minVal > 150 && diff < 38) {
        data[i + 3] = 0;
      } else if (minVal > 120 && diff < 22) {
        data[i + 3] = 0;
      } else if (r > 175 && g > 180 && b > 185 && diff < 45) {
        data[i + 3] = 0;
      }
    } else if (keyType === 'chaser') {
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const diff = maxVal - minVal;

      // 1. Light neutral grey background in b3632765.png: minVal > 155, maxVal < 205, diff < 16
      if (minVal > 155 && maxVal < 205 && diff < 16) {
        data[i + 3] = 0;
      }
      // 2. Division lines & frame borders: minVal > 65, maxVal < 140, diff < 16
      else if (minVal > 65 && maxVal < 140 && diff < 16) {
        data[i + 3] = 0;
      }
      // 3. Clear outer 2-pixel margin of the frame
      else if (px < 2 || px >= targetW - 2 || py < 2 || py >= targetH - 2) {
        if (diff < 22) {
          data[i + 3] = 0;
        }
      }
    } else if (keyType === 'crouch') {
      // Clear top-left corner frame number annotation
      if (px < targetW * 0.17 && py < targetH * 0.17) {
        data[i + 3] = 0;
        continue;
      }
      // Clear outer 2px cell boundary border
      if (px < 2 || px >= targetW - 2 || py < 2 || py >= targetH - 2) {
        data[i + 3] = 0;
        continue;
      }

      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const diff = maxVal - minVal;

      // Grey background in 419e2efa.png: ~[159, 167, 170]
      if (minVal > 115 && maxVal < 185 && diff < 18) {
        data[i + 3] = 0;
      } else if (minVal > 90 && maxVal < 145 && diff < 16) {
        data[i + 3] = 0; // cell division line
      }
    } else if (keyType === 'dark') {
      if (r < 44 && g < 44 && b < 48) {
        data[i + 3] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export async function loadGameSprites(): Promise<CachedSpriteSheet> {
  if (spriteCache.isLoaded) return spriteCache;

  const playerImgSrc = '/assets/aistudio/Gemini_Generated_Image_3ly6mb3ly6mb3ly6_79b7f407.jpg';
  const chaserImgSrc = '/assets/aistudio/____________b3632765.png';
  const crouchImgSrc = '/assets/aistudio/____________419e2efa.png';
  const bgImgSrc = '/src/assets/images/pixel_georgian_village_bg_1792778401237.jpg';
  const itemsImgSrc = '/src/assets/images/game_coin_and_powerups_1792776942566.jpg';

  // Load each independently so one asset failure never breaks the whole game
  const [playerImgRes, chaserImgRes, crouchImgRes, bgImgRes, itemsImgRes] = await Promise.allSettled([
    loadImage(playerImgSrc),
    loadImage(chaserImgSrc),
    loadImage(crouchImgSrc),
    loadImage(bgImgSrc),
    loadImage(itemsImgSrc),
  ]);

  // 1. Process Background
  if (bgImgRes.status === 'fulfilled') {
    spriteCache.bgImage = bgImgRes.value;
  }

  // 2. Process Player (Kote)
  if (playerImgRes.status === 'fulfilled') {
    const playerImg = playerImgRes.value;
    const pCellW = 344;
    const pCellH = 381;
    const targetW = 140;
    const targetH = 155;

    const runCoords = [
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 0, row: 2 },
      { col: 1, row: 2 },
      { col: 0, row: 3 },
    ];

    spriteCache.playerFrames = runCoords.map(({ col, row }) => {
      return extractFrameWithChromaKey(
        playerImg,
        col * pCellW,
        row * pCellH,
        pCellW,
        pCellH,
        targetW,
        targetH,
        'player'
      );
    });

    spriteCache.playerJump = extractFrameWithChromaKey(
      playerImg,
      1 * pCellW,
      3 * pCellH,
      pCellW,
      pCellH,
      targetW,
      targetH,
      'player'
    );

    // Clean portrait for UI cards and menus (from Frame 1, top center)
    spriteCache.playerPortrait = extractFrameWithChromaKey(
      playerImg,
      0,
      0,
      pCellW,
      pCellH,
      targetW,
      targetH,
      'player'
    );

    // Process Crouch / Roll animation from user's authentic spritesheet (____________419e2efa.png)
    if (crouchImgRes.status === 'fulfilled') {
      const crouchImg = crouchImgRes.value;
      const crouchCoords = [
        { sx: 106, sy: 12, sw: 98, sh: 130 },  // Frame 2: bending knees
        { sx: 210, sy: 12, sw: 98, sh: 130 },  // Frame 3: crouching lower
        { sx: 314, sy: 12, sw: 98, sh: 130 },  // Frame 4: leaning forward
        { sx: 106, sy: 146, sw: 98, sh: 148 }, // Frame 4: deep crouch
        { sx: 210, sy: 146, sw: 98, sh: 148 }, // Frame 5: low ground slide
        { sx: 314, sy: 146, sw: 98, sh: 148 }, // Frame 6: full ground roll tuck
      ];

      spriteCache.playerSlideFrames = crouchCoords.map(({ sx, sy, sw, sh }) => {
        return extractFrameWithChromaKey(
          crouchImg,
          sx,
          sy,
          sw,
          sh,
          targetW,
          targetH,
          'crouch'
        );
      });

      spriteCache.playerSlide = spriteCache.playerSlideFrames[4] || spriteCache.playerSlideFrames[5];
    } else {
      spriteCache.playerSlide = createSlideCanvas(spriteCache.playerFrames[2]);
    }
  }

  // 3. Process Chaser (New 4-frame curly-haired character in black Beatles shirt)
  if (chaserImgRes.status === 'fulfilled') {
    const chaserImg = chaserImgRes.value;
    const imgW = chaserImg.width; // 990
    const imgH = chaserImg.height; // 456
    const numCols = 4;
    const colW = imgW / numCols; // 247.5
    const chaserTargetW = 120;
    const chaserTargetH = 155;

    spriteCache.dogFrames = [];
    for (let col = 0; col < numCols; col++) {
      const sx = Math.round(col * colW) + 4;
      const sy = 4;
      const sw = Math.floor(colW) - 8;
      const sh = imgH - 8;

      const frameCanvas = extractFrameWithChromaKey(
        chaserImg,
        sx,
        sy,
        sw,
        sh,
        chaserTargetW,
        chaserTargetH,
        'chaser'
      );
      spriteCache.dogFrames.push(frameCanvas);
    }

    // High quality head & shoulders portrait for UI / Game Over
    spriteCache.chaserPortrait = extractFrameWithChromaKey(
      chaserImg,
      40,
      15,
      170,
      220,
      90,
      110,
      'chaser'
    );

    // Damage / slipped pose: rotated & red-tinted frame
    spriteCache.chaserDamage = createChaserDamageCanvas(
      spriteCache.dogFrames[1] || spriteCache.dogFrames[0]
    );
    spriteCache.chaserJump = spriteCache.dogFrames[0];
  }

  // 4. Process Collectibles (Toilet Paper Rolls & Gadgets)
  spriteCache.coinFrames = [
    createProceduralToiletPaperCanvas(0),
    createProceduralToiletPaperCanvas(1),
    createProceduralToiletPaperCanvas(2),
    createProceduralToiletPaperCanvas(3),
    createProceduralToiletPaperCanvas(4),
    createProceduralToiletPaperCanvas(5),
  ];

  spriteCache.magnetIcon = createProceduralMagnetIcon();
  spriteCache.speedIcon = createProceduralSpeedIcon();
  spriteCache.boneIcon = createProceduralTrapIcon();
  spriteCache.shieldIcon = createProceduralShieldIcon();
  spriteCache.isLoaded = true;

  return spriteCache;
}
