// Draws the "Gerakan Selesai · Total Volume" Instagram Story card on a
// 1080×1920 canvas. Everything is procedural so one function serves the
// in-app preview, the recorded MP4/WebM and the PNG (its last frame):
// drawVolumeFrame(ctx, assets, data, t) renders the scene at `t` seconds.
//
// Timeline (STORY_DURATION = 9s): header → total volume counts up → set
// rows slide in and out → a real-world object runs in → the Olympus
// kettlebell mascot walks under it and lifts it → "×N" badge + "Setara
// mengangkat N× <object>" → logo.

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const STORY_DURATION = 9;

export interface VolumeStorySet {
  weight: number;
  reps: number;
}

export interface VolumeStoryData {
  memberName: string;
  exerciseName: string;
  sets: VolumeStorySet[];
}

export interface VolumeStoryAssets {
  logo: HTMLImageElement | null;
  hexPattern: HTMLCanvasElement;
  displayFont: string;
  bodyFont: string;
}

// Rough real-world weights; the card picks the heaviest one the volume
// still beats so the multiplier stays a fun 1×–10× instead of "0,01 gajah".
const EQUIVALENTS = [
  { emoji: "🐈", name: "kucing", kg: 4 },
  { emoji: "🐕", name: "anjing", kg: 30 },
  { emoji: "🐼", name: "panda", kg: 100 },
  { emoji: "🏍️", name: "motor", kg: 110 },
  { emoji: "🐄", name: "sapi", kg: 600 },
  { emoji: "🚗", name: "mobil", kg: 1200 },
  { emoji: "🐘", name: "gajah", kg: 5000 },
] as const;

const COLORS = {
  bgTop: "#0d1d42",
  bgBottom: "#050b1c",
  accent: "#3b82f6",
  accentLight: "#60a5fa",
  white: "#ffffff",
  muted: "#94a3b8",
  navy: "#0b1220",
};

export function totalVolume(sets: VolumeStorySet[]) {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function pickEquivalent(volume: number) {
  let pick: (typeof EQUIVALENTS)[number] = EQUIVALENTS[0];
  for (const e of EQUIVALENTS) if (volume >= e.kg) pick = e;
  return { ...pick, factor: Math.max(0.1, Math.round((volume / pick.kg) * 10) / 10) };
}

export function formatKg(n: number) {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

export function storySummary(sets: VolumeStorySet[]) {
  const reps = sets.reduce((sum, s) => sum + s.reps, 0);
  const heaviest = sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0]);
  return `${sets.length} set · ${reps} reps · terberat ${formatKg(heaviest.weight)} kg × ${heaviest.reps}`;
}

export function shareCaption(data: VolumeStoryData) {
  const volume = totalVolume(data.sets);
  const eq = pickEquivalent(volume);
  return `Total volume ${data.exerciseName} ${formatKg(volume)} kg di OLYMPUS Lifting Club, setara ${formatKg(eq.factor)}× ${eq.name}! ${eq.emoji}💪`;
}

// --- easing helpers --------------------------------------------------------

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const progress = (t: number, start: number, dur: number) => clamp01((t - start) / dur);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

// --- static assets ---------------------------------------------------------

export function createHexPattern(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = STORY_WIDTH;
  c.height = STORY_HEIGHT;
  const g = c.getContext("2d")!;
  const r = 62;
  const w = Math.sqrt(3) * r;
  g.strokeStyle = "rgba(147, 197, 253, 0.07)";
  g.lineWidth = 2;
  for (let row = -1; row * r * 1.5 < STORY_HEIGHT + r; row++) {
    for (let col = -1; col * w < STORY_WIDTH + w; col++) {
      const cx = col * w + (row % 2 ? w / 2 : 0);
      const cy = row * r * 1.5;
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.stroke();
    }
  }
  return c;
}

export async function loadStoryAssets(): Promise<VolumeStoryAssets> {
  const root = getComputedStyle(document.documentElement);
  const displayFont = `${root.getPropertyValue("--font-oswald").trim() || "Oswald"}, system-ui, sans-serif`;
  const bodyFont = `${root.getPropertyValue("--font-inter").trim() || "Inter"}, system-ui, sans-serif`;
  await document.fonts?.ready;
  const logo = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/olympus-logo-light.png";
  });
  return { logo, hexPattern: createHexPattern(), displayFont, bodyFont };
}

// --- drawing ---------------------------------------------------------------

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, maxWidth: number) {
  let s = size;
  ctx.font = font(s);
  while (s > 20 && ctx.measureText(text).width > maxWidth) {
    s -= 4;
    ctx.font = font(s);
  }
  return s;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS.accentLight;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x, y, x + size, y);
  ctx.quadraticCurveTo(x, y, x, y + size);
  ctx.quadraticCurveTo(x, y, x - size, y);
  ctx.quadraticCurveTo(x, y, x, y - size);
  ctx.fill();
  ctx.restore();
}

// Mascot geometry, shared with the lifted object so it sits in the hands.
const MASCOT_R = 85;
const MASCOT_LEG = 150;
const ARM_REACH = 150;
const GROUND_Y = 1640;
const OBJECT_SIZE = 210;
const liftedHandY = GROUND_Y - MASCOT_LEG - MASCOT_R - ARM_REACH;

/**
 * The Olympus mascot: a white kettlebell ball with the logo's blue ring,
 * a handle on top, a face, and stick limbs. `lift` 0→1 raises the arms
 * overhead; `walk` drives the leg swing while it moves.
 */
function drawMascot(ctx: CanvasRenderingContext2D, cx: number, groundY: number, lift: number, walk: number) {
  const r = MASCOT_R;
  const bob = Math.abs(Math.sin(walk * Math.PI * 2)) * 8;
  const bodyY = groundY - MASCOT_LEG - bob;
  const limb = 18;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Legs
  const swing = Math.sin(walk * Math.PI * 2) * 22;
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = limb;
  for (const [side, phase] of [
    [-1, 1],
    [1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 38, bodyY + r * 0.8);
    ctx.lineTo(cx + side * 44 + swing * phase, groundY - 6);
    ctx.stroke();
  }

  // Arms: hanging at the sides → straight up holding the load.
  ctx.strokeStyle = COLORS.accentLight;
  for (const side of [-1, 1] as const) {
    const sx = cx + side * (r * 0.82);
    const sy = bodyY - 10;
    const hx = lerp(cx + side * (r + 50), cx + side * 58, easeInOut(lift));
    const hy = lerp(bodyY + 85, bodyY - r - ARM_REACH, easeInOut(lift));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(lerp(sx + side * 40, sx + side * 20, lift), lerp(sy + 40, sy - 110, lift), hx, hy);
    ctx.stroke();
    ctx.fillStyle = COLORS.accentLight;
    ctx.beginPath();
    ctx.arc(hx, hy, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kettlebell handle
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(cx, bodyY - r * 0.72, r * 0.52, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  // Body + blue ring (like the logo)
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.arc(cx, bodyY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, bodyY, r + 4, Math.PI * 0.15, Math.PI * 1.25);
  ctx.stroke();

  // Face
  ctx.fillStyle = COLORS.navy;
  const eyeY = bodyY - 12 - lift * 6;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * 30, eyeY, 10, lift > 0.5 ? 7 : 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.navy;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, bodyY + 18, 26, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // Cheeks
  ctx.fillStyle = "rgba(96, 165, 250, 0.35)";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * 58, bodyY + 18, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawVolumeFrame(
  ctx: CanvasRenderingContext2D,
  assets: VolumeStoryAssets,
  data: VolumeStoryData,
  t: number
) {
  const W = STORY_WIDTH;
  const H = STORY_HEIGHT;
  const cx = W / 2;
  const volume = totalVolume(data.sets);
  const eq = pickEquivalent(volume);
  const display = (weight: number, size: number) => `${weight} ${size}px ${assets.displayFont}`;
  const body = (weight: number, size: number) => `${weight} ${size}px ${assets.bodyFont}`;

  // Background: navy gradient, hex pattern, soft blue glow.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, COLORS.bgTop);
  bg.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(assets.hexPattern, 0, 0);
  const glow = ctx.createRadialGradient(cx, H * 0.45, 40, cx, H * 0.45, H * 0.55);
  glow.addColorStop(0, "rgba(37, 99, 235, 0.32)");
  glow.addColorStop(1, "rgba(37, 99, 235, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const fadeUp = (start: number, dur = 0.45) => {
    const p = easeOut(progress(t, start, dur));
    return { alpha: p, dy: (1 - p) * 30 };
  };

  // Header
  let a = fadeUp(0);
  ctx.globalAlpha = a.alpha;
  ctx.fillStyle = COLORS.accentLight;
  ctx.font = display(600, 50);
  ctx.fillText("🎉 GERAKAN SELESAI", cx, 290 + a.dy);

  a = fadeUp(0.3);
  ctx.globalAlpha = a.alpha;
  ctx.fillStyle = COLORS.white;
  const nameText = data.memberName.toUpperCase();
  fitText(ctx, nameText, (s) => display(700, s), 120, W - 140);
  ctx.fillText(nameText, cx, 420 + a.dy);

  a = fadeUp(0.55);
  ctx.globalAlpha = a.alpha;
  ctx.fillStyle = COLORS.muted;
  const exText = data.exerciseName.toUpperCase();
  fitText(ctx, exText, (s) => display(500, s), 54, W - 160);
  ctx.fillText(exText, cx, 500 + a.dy);

  const div = easeOut(progress(t, 0.8, 0.4));
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.accent;
  roundRect(ctx, cx - 95 * div, 550, 190 * div, 8, 4);
  ctx.fill();

  // Total volume counting up
  const count = easeOut(progress(t, 1.0, 1.5));
  if (t >= 1.0) {
    const shown = count >= 1 ? formatKg(volume) : Math.round(volume * count).toLocaleString("id-ID");
    ctx.globalAlpha = clamp01((t - 1.0) / 0.2);
    const numSize = fitText(ctx, shown, (s) => display(700, s), 270, W - 300);
    ctx.font = display(700, numSize);
    const numW = ctx.measureText(shown).width;
    ctx.font = display(700, 84);
    const unitW = ctx.measureText("KG").width;
    const startX = cx - (numW + 24 + unitW) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.accentLight;
    ctx.font = display(700, numSize);
    ctx.fillText(shown, startX, 840);
    ctx.fillStyle = COLORS.white;
    ctx.font = display(700, 84);
    ctx.fillText("KG", startX + numW + 24, 840);
    ctx.textAlign = "center";
  }

  a = fadeUp(1.5);
  ctx.globalAlpha = a.alpha;
  ctx.fillStyle = COLORS.white;
  ctx.font = display(500, 48);
  ctx.fillText("TOTAL VOLUME", cx, 920 + a.dy);
  ctx.fillStyle = COLORS.muted;
  ctx.font = body(500, 34);
  ctx.fillText(storySummary(data.sets), cx, 975 + a.dy);

  // Set breakdown: slides in one by one, then clears for the mascot.
  const rows = data.sets.slice(0, 5);
  const out = progress(t, 3.9, 0.4);
  rows.forEach((s, i) => {
    const p = easeOut(progress(t, 2.4 + i * 0.25, 0.35));
    const alpha = p * (1 - out);
    if (alpha <= 0) return;
    const y = 1035 + i * 78;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(148, 197, 255, 0.10)";
    roundRect(ctx, 170 + (1 - p) * 60, y, 740, 62, 31);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.accentLight;
    ctx.font = display(600, 30);
    ctx.fillText(`SET ${i + 1}`, 210 + (1 - p) * 60, y + 42);
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.white;
    ctx.font = body(700, 32);
    ctx.fillText(`${formatKg(s.weight)} kg × ${s.reps}`, 870 + (1 - p) * 60, y + 42);
    ctx.textAlign = "center";
  });
  if (data.sets.length > rows.length) {
    ctx.globalAlpha = easeOut(progress(t, 2.4 + rows.length * 0.25, 0.35)) * (1 - out);
    ctx.fillStyle = COLORS.muted;
    ctx.font = body(500, 30);
    ctx.fillText(`+${data.sets.length - rows.length} set lagi`, cx, 1035 + rows.length * 78 + 40);
  }
  ctx.globalAlpha = 1;

  // Ground shadow
  const groundY = GROUND_Y;
  const shadowIn = easeOut(progress(t, 4.0, 0.5));
  if (shadowIn > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * shadowIn})`;
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 10, 260 * shadowIn, 30 * shadowIn, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lift progress drives both the object and the mascot's arms.
  const lift = easeOutBack(progress(t, 5.9, 0.8));
  const objSize = OBJECT_SIZE;

  // Object runs in from the right with little hops and a dust trail.
  if (t >= 4.2) {
    const run = progress(t, 4.2, 0.9);
    const x = lerp(W + 200, cx + 10, easeOut(run));
    const hop = run < 1 ? Math.abs(Math.sin(run * Math.PI * 4)) * 26 * (1 - run) : 0;
    const restY = groundY - 30;
    // Emoji baseline just below the hands so the object rests on them.
    const liftedY = liftedHandY + 30;
    const y = lerp(restY, liftedY, clamp01(lift)) - hop;
    if (run < 1) {
      for (let i = 1; i <= 3; i++) {
        ctx.fillStyle = `rgba(148, 197, 255, ${0.25 * (1 - run)})`;
        ctx.beginPath();
        ctx.arc(x + objSize * 0.35 + i * 42, groundY - 8 - (i % 2) * 14, 12 + i * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Emoji animals face left, i.e. the way they run in. Canvas applies the
    // fillStyle's alpha to color emoji too, so reset it to opaque first.
    ctx.fillStyle = "#000";
    ctx.font = `${objSize}px ${EMOJI_FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(eq.emoji, x, y);
  }

  // Mascot walks in from the left, stops under the object, lifts it.
  if (t >= 5.0) {
    const walkIn = progress(t, 5.0, 0.85);
    const mx = lerp(-200, cx, easeOut(walkIn));
    drawMascot(ctx, mx, groundY, clamp01(lift), walkIn < 1 ? walkIn * 3 : 0);
  }

  // Badge, sparkles, caption, logo
  const badge = easeOutBack(progress(t, 6.9, 0.45));
  const liftedObjY = liftedHandY + 30;
  if (badge > 0) {
    const bx = cx + 165;
    const by = liftedObjY - 175;
    const label = `×${formatKg(eq.factor)}`;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(badge, badge);
    ctx.font = display(700, 56);
    const bw = ctx.measureText(label).width + 56;
    ctx.fillStyle = COLORS.accent;
    roundRect(ctx, -bw / 2, -46, bw, 92, 46);
    ctx.fill();
    ctx.fillStyle = COLORS.white;
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 2);
    ctx.restore();
    ctx.textBaseline = "alphabetic";

    const twinkle = (phase: number) => 0.5 + 0.5 * Math.sin((t - 6.9) * 6 + phase);
    drawSparkle(ctx, cx - 180, liftedObjY - 110, 22, badge * twinkle(0));
    drawSparkle(ctx, cx + 200, liftedObjY + 10, 16, badge * twinkle(2));
    drawSparkle(ctx, cx - 140, liftedObjY + 80, 14, badge * twinkle(4));
    drawSparkle(ctx, cx + 30, liftedObjY - 215, 18, badge * twinkle(1));
  }

  a = fadeUp(7.3);
  ctx.globalAlpha = a.alpha;
  ctx.fillStyle = COLORS.white;
  ctx.font = body(700, 50);
  ctx.fillText(`Setara mengangkat ${formatKg(eq.factor)}× ${eq.name}`, cx, 1740 + a.dy);

  a = fadeUp(7.9);
  ctx.globalAlpha = a.alpha;
  if (assets.logo) {
    const lh = 104;
    const lw = (assets.logo.naturalWidth / assets.logo.naturalHeight) * lh;
    ctx.drawImage(assets.logo, cx - lw / 2, 1772 + a.dy, lw, lh);
  } else {
    ctx.fillStyle = COLORS.white;
    ctx.font = display(700, 56);
    ctx.fillText("OLYMPUS", cx, 1865 + a.dy);
  }
  ctx.globalAlpha = 1;
}
