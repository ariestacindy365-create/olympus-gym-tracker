// "Progres Saya" story card: one exercise's estimated-1RM trend as a static
// 1080×1920 image (same look as the volume card in lib/volumeStory).

import {
  COLORS,
  STORY_WIDTH,
  drawStoryBackground,
  fitText,
  formatKg,
  roundRect,
  type VolumeStoryAssets,
} from "@/lib/volumeStory";
import { epley1RM } from "@/lib/oneRepMax";

export interface ProgressPoint {
  /** ISO date of the session. */
  date: string;
  value: number;
}

export interface ProgressStoryData {
  memberName: string;
  exerciseName: string;
  points: ProgressPoint[];
  /** Total distinct training days for this exercise. */
  sessions: number;
  maxWeight: number;
}

/** Best estimated 1RM per training day, oldest first. */
export function bestE1RMByDay(sets: { workoutDate: string; weight: number; reps: number }[]): ProgressPoint[] {
  const byDay = new Map<string, ProgressPoint>();
  for (const s of sets) {
    const key = s.workoutDate.slice(0, 10);
    const value = Math.round(epley1RM(s.weight, s.reps) * 10) / 10;
    const prev = byDay.get(key);
    if (!prev || value > prev.value) byDay.set(key, { date: s.workoutDate, value });
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function progressDelta(points: ProgressPoint[]) {
  if (points.length === 0) return 0;
  const first = points[0].value;
  const best = Math.max(...points.map((p) => p.value));
  return Math.round((best - first) * 10) / 10;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

export function progressCaption(data: ProgressStoryData) {
  const delta = progressDelta(data.points);
  const since = data.points[0] ? ` sejak ${shortDate(data.points[0].date)}` : "";
  return delta > 0
    ? `Estimasi 1RM ${data.exerciseName} naik ${formatKg(delta)} kg${since} di OLYMPUS Lifting Club! 📈💪`
    : `Progres ${data.exerciseName} aku di OLYMPUS Lifting Club 💪`;
}

export function drawProgressCard(ctx: CanvasRenderingContext2D, assets: VolumeStoryAssets, data: ProgressStoryData) {
  const W = STORY_WIDTH;
  const cx = W / 2;
  const display = (weight: number, size: number) => `${weight} ${size}px ${assets.displayFont}`;
  const body = (weight: number, size: number) => `${weight} ${size}px ${assets.bodyFont}`;
  const points = data.points;
  const delta = progressDelta(points);
  const best = points.length ? Math.max(...points.map((p) => p.value)) : 0;

  drawStoryBackground(ctx, assets);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.accentLight;
  ctx.font = display(600, 50);
  ctx.fillText("📈 PROGRES SAYA", cx, 290);

  ctx.fillStyle = COLORS.white;
  const nameText = data.memberName.toUpperCase();
  fitText(ctx, nameText, (s) => display(700, s), 120, W - 140);
  ctx.fillText(nameText, cx, 420);

  ctx.fillStyle = COLORS.muted;
  const exText = data.exerciseName.toUpperCase();
  fitText(ctx, exText, (s) => display(500, s), 54, W - 160);
  ctx.fillText(exText, cx, 500);

  ctx.fillStyle = COLORS.accent;
  roundRect(ctx, cx - 95, 550, 190, 8, 4);
  ctx.fill();

  // Headline: how much the estimated 1RM grew, or the best so far.
  const headline = delta > 0 ? `+${formatKg(delta)}` : formatKg(best);
  const numSize = fitText(ctx, headline, (s) => display(700, s), 250, W - 300);
  ctx.font = display(700, numSize);
  const numW = ctx.measureText(headline).width;
  ctx.font = display(700, 84);
  const unitW = ctx.measureText("KG").width;
  const startX = cx - (numW + 24 + unitW) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.accentLight;
  ctx.font = display(700, numSize);
  ctx.fillText(headline, startX, 820);
  ctx.fillStyle = COLORS.white;
  ctx.font = display(700, 84);
  ctx.fillText("KG", startX + numW + 24, 820);
  ctx.textAlign = "center";

  ctx.fillStyle = COLORS.muted;
  ctx.font = body(500, 40);
  const sub =
    delta > 0 && points.length > 0
      ? `Estimasi 1RM ${formatKg(points[0].value)} → ${formatKg(best)} kg sejak ${shortDate(points[0].date)}`
      : "Estimasi 1RM terbaik";
  fitText(ctx, sub, (s) => body(500, s), 40, W - 140);
  ctx.fillText(sub, cx, 900);

  // Chart panel
  const px = 90;
  const py = 980;
  const pw = W - 180;
  const ph = 520;
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  roundRect(ctx, px, py, pw, ph, 36);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (points.length > 0) {
    const values = points.map((p) => p.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max(2, (hi - lo) * 0.15);
    const min = lo - pad;
    const max = hi + pad;
    const left = px + 60;
    const right = px + pw - 60;
    const top = py + 90;
    const bottom = py + ph - 90;
    const xAt = (i: number) => (points.length === 1 ? (left + right) / 2 : left + ((right - left) * i) / (points.length - 1));
    const yAt = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);

    // Gridlines
    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 2;
    for (let g = 0; g <= 3; g++) {
      const y = top + ((bottom - top) * g) / 3;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    // Area under the line
    const area = ctx.createLinearGradient(0, top, 0, bottom);
    area.addColorStop(0, "rgba(59, 130, 246, 0.45)");
    area.addColorStop(1, "rgba(59, 130, 246, 0)");
    ctx.beginPath();
    ctx.moveTo(xAt(0), bottom);
    points.forEach((p, i) => ctx.lineTo(xAt(i), yAt(p.value)));
    ctx.lineTo(xAt(points.length - 1), bottom);
    ctx.closePath();
    ctx.fillStyle = area;
    ctx.fill();

    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(xAt(i), yAt(p.value)) : ctx.lineTo(xAt(i), yAt(p.value))));
    ctx.strokeStyle = COLORS.accentLight;
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    const bestIndex = values.lastIndexOf(hi);
    points.forEach((p, i) => {
      const highlight = i === bestIndex;
      ctx.beginPath();
      ctx.arc(xAt(i), yAt(p.value), highlight ? 18 : points.length > 24 ? 0 : 9, 0, Math.PI * 2);
      ctx.fillStyle = highlight ? COLORS.white : COLORS.accentLight;
      ctx.fill();
    });

    // Best value tag above its point
    const bx = Math.min(right - 60, Math.max(left + 60, xAt(bestIndex)));
    const by = yAt(hi) - 46;
    const tag = `${formatKg(hi)} kg`;
    ctx.font = display(700, 40);
    const tw = ctx.measureText(tag).width + 36;
    ctx.fillStyle = COLORS.accent;
    roundRect(ctx, bx - tw / 2, by - 40, tw, 58, 29);
    ctx.fill();
    ctx.fillStyle = COLORS.white;
    ctx.fillText(tag, bx, by + 2);

    ctx.fillStyle = COLORS.muted;
    ctx.font = body(500, 32);
    ctx.textAlign = "left";
    ctx.fillText(shortDate(points[0].date), left, py + ph - 36);
    ctx.textAlign = "right";
    ctx.fillText(shortDate(points[points.length - 1].date), right, py + ph - 36);
    ctx.textAlign = "center";
  }

  // Stat row
  const stats = [
    { label: "SESI", value: String(data.sessions) },
    { label: "BEBAN MAKS", value: `${formatKg(data.maxWeight)} kg` },
    { label: "1RM TERBAIK", value: `${formatKg(best)} kg` },
  ];
  const colW = (W - 180) / 3;
  stats.forEach((st, i) => {
    const x = 90 + colW * i + colW / 2;
    ctx.fillStyle = COLORS.white;
    ctx.font = display(700, 64);
    ctx.fillText(st.value, x, 1620);
    ctx.fillStyle = COLORS.muted;
    ctx.font = body(600, 30);
    ctx.fillText(st.label, x, 1670);
  });

  if (assets.logo) {
    const lh = 104;
    const lw = (assets.logo.naturalWidth / assets.logo.naturalHeight) * lh;
    ctx.drawImage(assets.logo, cx - lw / 2, 1772, lw, lh);
  } else {
    ctx.fillStyle = COLORS.white;
    ctx.font = display(700, 56);
    ctx.fillText("OLYMPUS", cx, 1865);
  }
}
