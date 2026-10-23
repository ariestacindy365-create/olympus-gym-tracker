// Draws the "Gerakan Selesai · Total Volume" Instagram Story card on a
// 1080×1920 canvas. Everything is procedural so one function serves the
// in-app preview, the recorded MP4/WebM and the PNG (its last frame):
// drawVolumeFrame(ctx, assets, data, t) renders the scene at `t` seconds.
//
// Timeline (STORY_DURATION = 9s): header → total volume counts up → set
// rows slide in and out → a real-world object runs in → a cartoon
// lifter in Olympus kit walks under it and lifts it → "×N" badge + "Setara
// mengangkat N× <object>" → logo.
//
// The lifter is one of three looks (cowok / cewek / cewek berhijab) that
// the member picks in the share popup.

import { setVolume, type SetUnit } from "@/lib/setUnits";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const STORY_DURATION = 9;

export interface VolumeStorySet {
  weight: number;
  reps: number;
  unit?: SetUnit;
}

export interface VolumeStoryData {
  memberName: string;
  exerciseName: string;
  sets: VolumeStorySet[];
  /** ISO date of a past session (shared from history); omitted for today. */
  date?: string;
  /** Set when this exercise had a PR in the session, e.g. "120 KG × 12 · +20 KG". */
  prLabel?: string;
  /** Which cartoon lifter does the lift (picked by the member). */
  character?: LifterCharacter;
  skinTone?: SkinTone;
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

export const COLORS = {
  bgTop: "#0d1d42",
  bgBottom: "#050b1c",
  accent: "#3b82f6",
  accentLight: "#60a5fa",
  white: "#ffffff",
  muted: "#94a3b8",
  navy: "#0b1220",
};

export function totalVolume(sets: VolumeStorySet[]) {
  return sets.reduce((sum, s) => sum + setVolume(s), 0);
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
  const pr = data.prLabel ? " Plus rekor pribadi baru 🏆" : "";
  return `Total volume ${data.exerciseName} ${formatKg(volume)} kg di OLYMPUS Lifting Club, setara ${formatKg(eq.factor)}× ${eq.name}! ${eq.emoji}💪${pr}`;
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

export function fitText(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, maxWidth: number) {
  let s = size;
  ctx.font = font(s);
  while (s > 20 && ctx.measureText(text).width > maxWidth) {
    s -= 4;
    ctx.font = font(s);
  }
  return s;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

// Lifter geometry, shared with the lifted object so it sits in the hands.
const LEG = 120; // hip → ground
const TORSO = 170; // shoulder → hip
const NECK = 14;
const HEAD_R = 50;
const GROUND_Y = 1640;
const OBJECT_SIZE = 190;
const liftedHandY = GROUND_Y - LEG - TORSO - NECK - HEAD_R * 2 - 40;

export type LifterCharacter = "pria" | "wanita" | "hijab";

export type SkinTone = "terang" | "langsat" | "sawo" | "gelap";

export const SKIN_TONES: { id: SkinTone; label: string; color: string }[] = [
  { id: "terang", label: "Terang", color: "#f3d3b5" },
  { id: "langsat", label: "Kuning langsat", color: "#e6b590" },
  { id: "sawo", label: "Sawo matang", color: "#c08457" },
  { id: "gelap", label: "Gelap", color: "#7d4f31" },
];

export const DEFAULT_SKIN_TONE: SkinTone = "langsat";

export const LIFTER_CHARACTERS: { id: LifterCharacter; label: string; emoji: string }[] = [
  { id: "pria", label: "Cowok", emoji: "👨" },
  { id: "wanita", label: "Cewek", emoji: "👩" },
  { id: "hijab", label: "Cewek berhijab", emoji: "🧕" },
];

const LIFTER = {
  hair: "#2a1c14",
  top: "#2563eb",
  topEdge: "#1d4ed8",
  hijab: "#93c5fd",
  hijabShade: "#60a5fa",
  bottoms: "#1f2937",
  belt: "#111827",
  buckle: "#facc15",
  shoe: "#f8fafc",
  outline: "rgba(255, 255, 255, 0.22)",
};

/**
 * Cartoon lifter in Olympus kit — one of three looks (cowok, cewek, cewek
 * berhijab). `lift` 0→1 raises the arms overhead; `walk` drives the leg and
 * arm swing while it walks in.
 */
function drawLifter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  lift: number,
  walk: number,
  character: LifterCharacter,
  skinTone: SkinTone
) {
  const female = character !== "pria";
  const skin = (SKIN_TONES.find((t) => t.id === skinTone) ?? SKIN_TONES[1]).color;
  const bob = Math.abs(Math.sin(walk * Math.PI * 2)) * 6;
  const hipY = groundY - LEG - bob;
  const shoulderY = hipY - TORSO;
  const headY = shoulderY - NECK - HEAD_R;
  const shoulderHalf = female ? 70 : 82;
  const waistHalf = female ? 52 : 58;
  const swing = Math.sin(walk * Math.PI * 2) * 20;
  const up = easeInOut(lift);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Legs (bare below shorts for cowok, leggings for both cewek looks) + shoes
  for (const [side, phase] of [
    [-1, 1],
    [1, -1],
  ] as const) {
    const fx = cx + side * 34 + swing * phase;
    ctx.strokeStyle = female ? LIFTER.bottoms : skin;
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(cx + side * 30, hipY);
    ctx.lineTo(fx, groundY - 16);
    ctx.stroke();
    ctx.fillStyle = LIFTER.shoe;
    roundRect(ctx, fx - 22 + side * 6, groundY - 22, 44, 22, 10);
    ctx.fill();
  }
  // Bottoms: shorts (cowok) or the top of the leggings
  ctx.fillStyle = LIFTER.bottoms;
  roundRect(ctx, cx - waistHalf - 6, hipY - 24, (waistHalf + 6) * 2, female ? 46 : 62, 16);
  ctx.fill();
  if (!female) {
    ctx.strokeStyle = LIFTER.outline;
    ctx.lineWidth = 4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * (waistHalf + 2), hipY - 14);
      ctx.lineTo(cx + side * (waistHalf + 2), hipY + 32);
      ctx.stroke();
    }
  }

  // High bun (cewek without hijab): sits on top of the head, between the
  // raised arms, so it stays visible through the lift.
  if (character === "wanita") {
    ctx.fillStyle = LIFTER.hair;
    ctx.beginPath();
    ctx.arc(cx + 8, headY - HEAD_R - 6 + Math.sin(walk * Math.PI * 4) * 3, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hijab drape over the shoulders goes under the top's neckline
  if (character === "hijab") {
    ctx.fillStyle = LIFTER.hijabShade;
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY + 18, shoulderHalf - 6, 46, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Torso: tank top (long-sleeve top for hijab — sleeves are the arms below)
  ctx.fillStyle = LIFTER.top;
  ctx.beginPath();
  ctx.moveTo(cx - shoulderHalf, shoulderY + 6);
  ctx.quadraticCurveTo(cx - shoulderHalf - 4, shoulderY - 6, cx - shoulderHalf + 18, shoulderY - 8);
  ctx.lineTo(cx + shoulderHalf - 18, shoulderY - 8);
  ctx.quadraticCurveTo(cx + shoulderHalf + 4, shoulderY - 6, cx + shoulderHalf, shoulderY + 6);
  ctx.lineTo(cx + waistHalf, hipY - 20);
  ctx.lineTo(cx - waistHalf, hipY - 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = LIFTER.topEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Olympus badge on the chest
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.arc(cx, shoulderY + 58, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, shoulderY + 58, 22, Math.PI * 0.2, Math.PI * 1.3);
  ctx.stroke();
  // Lifting belt
  ctx.fillStyle = LIFTER.belt;
  roundRect(ctx, cx - waistHalf - 4, hipY - 46, (waistHalf + 4) * 2, 30, 8);
  ctx.fill();
  ctx.strokeStyle = LIFTER.buckle;
  ctx.lineWidth = 5;
  roundRect(ctx, cx - 14, hipY - 42, 28, 22, 4);
  ctx.stroke();

  // Arms: sides → straight up holding the load. Sleeved for hijab.
  for (const side of [-1, 1] as const) {
    const sx = cx + side * (shoulderHalf - 10);
    const sy = shoulderY + 10;
    const hx = lerp(cx + side * (shoulderHalf + 34) - swing * side * 0.6, cx + side * 60, up);
    const hy = lerp(hipY - 30, liftedHandY + bob, up);
    const ex = lerp(cx + side * (shoulderHalf + 26), cx + side * (shoulderHalf + 20), up);
    const ey = lerp(shoulderY + 80, shoulderY - 70, up);
    ctx.strokeStyle = character === "hijab" ? LIFTER.top : skin;
    ctx.lineWidth = female ? 24 : 30;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(ex, ey, hx, hy);
    ctx.stroke();
    if (!female) {
      // Bicep bulge
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(lerp(sx, ex, 0.55), lerp(sy, ey, 0.55), 19, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx, hy, 17, 0, Math.PI * 2);
    ctx.fill();
  }

  // Neck
  if (character !== "hijab") {
    ctx.fillStyle = skin;
    roundRect(ctx, cx - 16, shoulderY - NECK - 12, 32, NECK + 18, 8);
    ctx.fill();
  }

  // Head
  if (character === "hijab") {
    // Sport hijab framing the face down to the chin
    ctx.fillStyle = LIFTER.hijab;
    ctx.beginPath();
    ctx.ellipse(cx, headY + 8, HEAD_R + 14, HEAD_R + 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, headY + 10, HEAD_R - 10, HEAD_R - 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(cx, headY, HEAD_R, 0, Math.PI * 2);
    ctx.fill();
    // Hair cap
    ctx.fillStyle = LIFTER.hair;
    ctx.beginPath();
    ctx.arc(cx, headY - 2, HEAD_R + 2, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(cx + HEAD_R * 0.3, headY - HEAD_R * 0.55, cx - HEAD_R - 1, headY - 6);
    ctx.fill();
    if (female) {
      // Side hair framing the face
      ctx.beginPath();
      ctx.ellipse(cx - HEAD_R + 6, headY + 6, 10, 26, 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Headband
      ctx.strokeStyle = COLORS.accentLight;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(cx, headY + 4, HEAD_R - 1, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    } else {
      // Short textured hair: a quiff swept up at the front plus sideburns.
      ctx.beginPath();
      ctx.moveTo(cx - HEAD_R * 0.85, headY - HEAD_R * 0.45);
      ctx.quadraticCurveTo(cx - HEAD_R * 0.6, headY - HEAD_R * 1.35, cx + HEAD_R * 0.15, headY - HEAD_R * 1.3);
      ctx.quadraticCurveTo(cx + HEAD_R * 0.75, headY - HEAD_R * 1.28, cx + HEAD_R * 0.92, headY - HEAD_R * 0.55);
      ctx.quadraticCurveTo(cx + HEAD_R * 0.2, headY - HEAD_R * 0.85, cx - HEAD_R * 0.85, headY - HEAD_R * 0.45);
      ctx.fill();
      for (const side of [-1, 1]) {
        roundRect(ctx, cx + side * (HEAD_R - 8) - 6, headY - 14, 12, 26, 6);
        ctx.fill();
      }
    }
  }

  // Face: open eyes while walking, happy squint once the load is up
  const faceY = headY + (character === "hijab" ? 12 : 6);
  ctx.fillStyle = COLORS.navy;
  ctx.strokeStyle = COLORS.navy;
  ctx.lineWidth = 6;
  for (const side of [-1, 1]) {
    const exx = cx + side * 18;
    if (lift > 0.6) {
      ctx.beginPath();
      ctx.arc(exx, faceY + 2, 9, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(exx, faceY, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.arc(cx, faceY + 14, 13, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.fillStyle = "rgba(244, 114, 182, 0.35)";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * 32, faceY + 16, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Navy gradient + hex pattern + soft blue glow shared by every story card. */
export function drawStoryBackground(ctx: CanvasRenderingContext2D, assets: VolumeStoryAssets) {
  const W = STORY_WIDTH;
  const H = STORY_HEIGHT;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, COLORS.bgTop);
  bg.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(assets.hexPattern, 0, 0);
  const glow = ctx.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.45, H * 0.55);
  glow.addColorStop(0, "rgba(37, 99, 235, 0.32)");
  glow.addColorStop(1, "rgba(37, 99, 235, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

export function drawVolumeFrame(
  ctx: CanvasRenderingContext2D,
  assets: VolumeStoryAssets,
  data: VolumeStoryData,
  t: number
) {
  const W = STORY_WIDTH;
  const cx = W / 2;
  const volume = totalVolume(data.sets);
  const eq = pickEquivalent(volume);
  const display = (weight: number, size: number) => `${weight} ${size}px ${assets.displayFont}`;
  const body = (weight: number, size: number) => `${weight} ${size}px ${assets.bodyFont}`;

  drawStoryBackground(ctx, assets);

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
  ctx.fillText(data.prLabel ? "🏆 REKOR PRIBADI BARU" : "🎉 GERAKAN SELESAI", cx, 290 + a.dy);

  a = fadeUp(0.3);
  ctx.globalAlpha = a.alpha;
  ctx.fillStyle = COLORS.white;
  const nameText = data.memberName.toUpperCase();
  fitText(ctx, nameText, (s) => display(700, s), 120, W - 140);
  ctx.fillText(nameText, cx, 420 + a.dy);

  a = fadeUp(0.55);
  ctx.globalAlpha = a.alpha;
  ctx.fillStyle = COLORS.muted;
  const exText = data.date
    ? `${data.exerciseName} · ${new Date(data.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`.toUpperCase()
    : data.exerciseName.toUpperCase();
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

  // Set breakdown: slides in one by one, then clears for the mascot. A PR
  // pill sits on top of it (and clears with it) so it never meets the lift.
  const out = progress(t, 3.9, 0.4);
  const rowsTop = data.prLabel ? 1115 : 1035;
  if (data.prLabel) {
    const p = easeOutBack(progress(t, 2.0, 0.4));
    if (p > 0 && out < 1) {
      ctx.save();
      ctx.globalAlpha = clamp01(p) * (1 - out);
      ctx.translate(cx, 1050);
      ctx.scale(p, p);
      ctx.font = display(700, 38);
      const pw = ctx.measureText(data.prLabel).width + 70;
      ctx.fillStyle = COLORS.accent;
      roundRect(ctx, -pw / 2, -34, pw, 68, 34);
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.textBaseline = "middle";
      ctx.fillText(data.prLabel, 0, 2);
      ctx.restore();
      ctx.textBaseline = "alphabetic";
    }
  }
  const rows = data.sets.slice(0, data.prLabel ? 4 : 5);
  rows.forEach((s, i) => {
    const p = easeOut(progress(t, 2.4 + i * 0.25, 0.35));
    const alpha = p * (1 - out);
    if (alpha <= 0) return;
    const y = rowsTop + i * 78;
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
    ctx.fillText(`+${data.sets.length - rows.length} set lagi`, cx, rowsTop + rows.length * 78 + 40);
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
    drawLifter(
      ctx,
      mx,
      groundY,
      clamp01(lift),
      walkIn < 1 ? walkIn * 3 : 0,
      data.character ?? "pria",
      data.skinTone ?? DEFAULT_SKIN_TONE
    );
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

/** DB enum (PRIA / WANITA / HIJAB) → the renderer's lifter id. */
export function lifterFromStored(stored: string | null | undefined): LifterCharacter | null {
  if (stored === "PRIA") return "pria";
  if (stored === "WANITA") return "wanita";
  if (stored === "HIJAB") return "hijab";
  return null;
}

/** DB enum (TERANG / LANGSAT / SAWO / GELAP) → the renderer's skin tone id. */
export function skinToneFromStored(stored: string | null | undefined): SkinTone | null {
  const id = stored?.toLowerCase();
  return SKIN_TONES.some((t) => t.id === id) ? (id as SkinTone) : null;
}

/** Persists the member's picks on their account (PATCH /api/member/story-character). */
export async function saveStoryPrefs(prefs: { character?: LifterCharacter; skinTone?: SkinTone }): Promise<boolean> {
  try {
    const res = await fetch("/api/member/story-character", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    return res.ok;
  } catch {
    return false;
  }
}
