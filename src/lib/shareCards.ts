// The share cards ("Bagikan latihan"), drawn on a transparent 1080×1440
// canvas so every card can sit on a photo (Bening) or on a solid
// background (Biru, Terang). Canvas, not an HTML screenshot, so the text
// always shows up on iPhone.

import type { LifterCharacter, SkinTone } from "@/lib/volumeStory";

export const CARD_W = 1080;
export const CARD_H = 1440;

export type CardInk = "light" | "dark";

export interface StatCard {
  /** Small caps line above the number, e.g. the workout title. */
  eyebrow: string;
  emoji?: string;
  big: string;
  unit: string;
  sub?: string;
  /** Up to four small figures along the bottom. */
  stats?: { value: string; label: string }[];
}

const INK = {
  light: { text: "#ffffff", muted: "rgba(255,255,255,0.75)", accent: "#60a5fa", shadow: "rgba(0,0,0,0.45)", tile: "rgba(255,255,255,0.10)", logo: "/olympus-logo-light-bw.png" },
  dark: { text: "#0b1220", muted: "rgba(11,18,32,0.68)", accent: "#2563eb", shadow: "rgba(255,255,255,0.5)", tile: "rgba(37,99,235,0.08)", logo: "/olympus-logo-bw.png" },
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** The app's next/font families (their names are hashed), read off the page. */
function fontFamilies() {
  const probe = document.createElement("span");
  probe.className = "font-display";
  document.body.appendChild(probe);
  const display = getComputedStyle(probe).fontFamily;
  probe.remove();
  return { display, body: getComputedStyle(document.body).fontFamily };
}

/** Largest size (from `size` down) at which `text` fits `max`. */
function fitSize(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, size: number, max: number) {
  let px = size;
  ctx.font = font(px);
  while (px > 40 && ctx.measureText(text).width > max) {
    px -= 6;
    ctx.font = font(px);
  }
  return px;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** Shared setup for a card: size, glow, fonts. */
async function startCard(canvas: HTMLCanvasElement, ink: CardInk) {
  await document.fonts?.ready;
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  ctx.textBaseline = "alphabetic";
  // A soft glow keeps the text readable on busy photos.
  ctx.shadowColor = INK[ink].shadow;
  ctx.shadowBlur = 18;
  return { ctx, c: INK[ink], ...fontFamilies(), W: CARD_W, H: CARD_H, margin: 80 };
}

type Ink = (typeof INK)["light"];

/** Footer: logo left, member right. */
async function footer(ctx: CanvasRenderingContext2D, c: Ink, body: string, memberName: string, margin: number) {
  const logo = await loadImage(c.logo);
  if (logo) {
    const h = 64;
    ctx.drawImage(logo, margin, CARD_H - margin - h + 8, (logo.width / logo.height) * h, h);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = c.muted;
  ctx.font = `600 34px ${body}`;
  ctx.fillText(memberName, CARD_W - margin, CARD_H - margin, (CARD_W - margin * 2) / 2);
}

/** Eyebrow + big title, left aligned; returns the y below them. */
function heading(ctx: CanvasRenderingContext2D, c: Ink, display: string, body: string, eyebrow: string, title: string, margin: number, top = 160) {
  const maxW = CARD_W - margin * 2;
  ctx.textAlign = "left";
  ctx.fillStyle = c.muted;
  ctx.font = `600 36px ${body}`;
  ctx.fillText(eyebrow.toUpperCase().slice(0, 44), margin, top, maxW);
  ctx.fillStyle = c.text;
  const px = fitSize(ctx, title, (p) => `700 ${p}px ${display}`, 110, maxW);
  ctx.font = `700 ${px}px ${display}`;
  ctx.fillText(title, margin, top + px * 0.95 + 14, maxW);
  return top + px + 40;
}

/** One big number and what it means (Rekor baru, Kalori). */
export async function drawStatCard(canvas: HTMLCanvasElement, card: StatCard, ink: CardInk, memberName: string) {
  const { ctx, c, display, body, W, H, margin } = await startCard(canvas, ink);
  const maxW = W - margin * 2;
  ctx.textAlign = "center";
  ctx.fillStyle = c.muted;
  ctx.font = `600 38px ${body}`;
  ctx.fillText(card.eyebrow.toUpperCase().slice(0, 40), W / 2, 190, maxW);

  let y = 330;
  if (card.emoji) {
    ctx.font = `170px ${body}`;
    ctx.fillText(card.emoji, W / 2, y + 140);
    y += 200;
  }
  const bigPx = fitSize(ctx, card.big, (px) => `700 ${px}px ${display}`, card.emoji ? 240 : 290, maxW);
  y += bigPx * 0.9 + (card.emoji ? 10 : 80);
  ctx.fillStyle = c.text;
  ctx.fillText(card.big, W / 2, y);
  // Clear of descenders ("70 kg").
  y += card.emoji ? 100 : 84;
  ctx.fillStyle = c.accent;
  ctx.font = `700 60px ${display}`;
  ctx.fillText(card.unit.toUpperCase(), W / 2, y, maxW);
  if (card.sub) {
    ctx.fillStyle = c.text;
    ctx.font = `500 42px ${body}`;
    for (const line of wrap(ctx, card.sub, maxW)) {
      y += 62;
      ctx.fillText(line, W / 2, y);
    }
  }
  if (card.stats?.length) {
    const colW = maxW / card.stats.length;
    card.stats.forEach((s, i) => {
      const x = margin + colW * (i + 0.5);
      ctx.fillStyle = c.text;
      ctx.font = `700 ${fitSize(ctx, s.value, (px) => `700 ${px}px ${display}`, 80, colW - 20)}px ${display}`;
      ctx.fillText(s.value, x, H - 290);
      ctx.fillStyle = c.muted;
      ctx.font = `500 34px ${body}`;
      ctx.fillText(s.label, x, H - 240, colW - 12);
    });
  }
  await footer(ctx, c, body, memberName, margin);
}

export interface SummaryCard {
  /** "Sabtu, 14 November 2026" */
  date: string;
  title: string;
  tiles: { value: string; label: string }[];
}

/** "Ringkasan": date, workout title and a 2×2 of Durasi, Volume, Set, Rekor. */
export async function drawSummaryCard(canvas: HTMLCanvasElement, card: SummaryCard, ink: CardInk, memberName: string) {
  const { ctx, c, display, body, W, margin } = await startCard(canvas, ink);
  const top = heading(ctx, c, display, body, card.date, card.title, margin, 190) + 50;
  const gap = 28;
  const tw = (W - margin * 2 - gap) / 2;
  const th = 330;
  card.tiles.slice(0, 4).forEach((t, i) => {
    const x = margin + (i % 2) * (tw + gap);
    const y = top + Math.floor(i / 2) * (th + gap);
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = c.tile;
    ctx.beginPath();
    ctx.roundRect(x, y, tw, th, 36);
    ctx.fill();
    ctx.restore();
    ctx.textAlign = "left";
    ctx.fillStyle = c.muted;
    ctx.font = `600 36px ${body}`;
    ctx.fillText(t.label.toUpperCase(), x + 44, y + 84, tw - 88);
    ctx.fillStyle = c.text;
    ctx.font = `700 ${fitSize(ctx, t.value, (px) => `700 ${px}px ${display}`, 130, tw - 88)}px ${display}`;
    ctx.fillText(t.value, x + 44, y + th - 64, tw - 88);
  });
  await footer(ctx, c, body, memberName, margin);
}

export interface TotalCard {
  eyebrow: string;
  /** "3.960" */
  big: string;
  /** The thing it equals, repeated to show the size. */
  emoji?: string;
  times?: number;
  /** "Setara mengangkat 3,5× sapi" */
  sub?: string;
  /** What was lifted: each movement and its kg, heaviest first. */
  rows?: { name: string; value: string }[];
  /** The member's cartoon lifter holding the animal (3D); the emoji when WebGL isn't there. */
  art?: { animal: string; character: LifterCharacter; skinTone: SkinTone };
}

/** The 3D lift as a picture, or null (no WebGL, or an unknown animal). */
async function liftArt(art: TotalCard["art"], size: number): Promise<HTMLCanvasElement | null> {
  if (!art) return null;
  try {
    const m = await import("@/lib/story3d");
    if (!(art.animal in m.ANIMAL_NAMES)) return null;
    return m.renderLiftStill({ animal: art.animal as import("@/lib/story3d").AnimalName, character: art.character, skinTone: art.skinTone, size });
  } catch (e) {
    console.warn("3D card art unavailable", e);
    return null;
  }
}

/** "Total angkatan": the day's volume and what it weighs as much as. */
export async function drawTotalCard(canvas: HTMLCanvasElement, card: TotalCard, ink: CardInk, memberName: string) {
  const { ctx, c, display, body, W, margin } = await startCard(canvas, ink);
  const maxW = W - margin * 2;
  if (card.rows?.length) return drawTotalWithList(ctx, c, display, body, card, memberName, margin);
  ctx.textAlign = "center";
  ctx.fillStyle = c.muted;
  ctx.font = `600 38px ${body}`;
  ctx.fillText(card.eyebrow.toUpperCase().slice(0, 40), W / 2, 190, maxW);
  const px = fitSize(ctx, card.big, (p) => `700 ${p}px ${display}`, 300, maxW);
  ctx.fillStyle = c.text;
  ctx.fillText(card.big, W / 2, 330 + px * 0.9);
  ctx.fillStyle = c.accent;
  ctx.font = `700 64px ${display}`;
  ctx.fillText("KG TOTAL ANGKATAN", W / 2, 330 + px * 0.9 + 100, maxW);
  const art = await liftArt(card.art, 760);
  if (art) {
    const s = 470;
    ctx.drawImage(art, W / 2 - s / 2, 1000 - s + 20, s, s);
  } else if (card.emoji) {
    const n = Math.max(1, Math.min(6, Math.round(card.times ?? 1)));
    ctx.font = `${n > 3 ? 120 : 150}px ${body}`;
    ctx.fillText(Array.from({ length: n }, () => card.emoji).join(""), W / 2, 960, maxW);
  }
  if (card.sub) {
    ctx.fillStyle = c.text;
    ctx.font = `500 46px ${body}`;
    let y = 1080;
    for (const line of wrap(ctx, card.sub, maxW)) {
      ctx.fillText(line, W / 2, y);
      y += 62;
    }
  }
  await footer(ctx, c, body, memberName, margin);
}

/** Total angkatan with the list of what was lifted: number, animal, then the movements. */
async function drawTotalWithList(ctx: CanvasRenderingContext2D, c: Ink, display: string, body: string, card: TotalCard, memberName: string, margin: number) {
  const W = CARD_W;
  const maxW = W - margin * 2;
  ctx.textAlign = "center";
  ctx.fillStyle = c.muted;
  ctx.font = `600 36px ${body}`;
  ctx.fillText(card.eyebrow.toUpperCase().slice(0, 40), W / 2, 150, maxW);
  const px = fitSize(ctx, card.big, (p) => `700 ${p}px ${display}`, 230, maxW);
  ctx.fillStyle = c.text;
  const bigY = 190 + px * 0.9;
  ctx.fillText(card.big, W / 2, bigY);
  ctx.fillStyle = c.accent;
  ctx.font = `700 54px ${display}`;
  ctx.fillText("KG TOTAL ANGKATAN", W / 2, bigY + 80, maxW);
  let y = bigY + 80;
  const art = await liftArt(card.art, 640);
  if (art) {
    const s = 360;
    ctx.drawImage(art, W / 2 - s / 2, y + 10, s, s);
    y += s - 20;
  } else if (card.emoji) {
    const n = Math.max(1, Math.min(6, Math.round(card.times ?? 1)));
    ctx.font = `${n > 3 ? 84 : 100}px ${body}`;
    y += 130;
    ctx.fillText(Array.from({ length: n }, () => card.emoji).join(""), W / 2, y, maxW);
  }
  if (card.sub) {
    ctx.fillStyle = c.text;
    ctx.font = `600 42px ${body}`;
    y += 72;
    ctx.fillText(card.sub, W / 2, y, maxW);
  }
  // The list: what was lifted, heaviest first.
  y += 64;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = c.muted;
  ctx.fillRect(margin, y, maxW, 3);
  ctx.globalAlpha = 1;
  const rows = card.rows ?? [];
  const room = Math.max(1, Math.floor((CARD_H - margin - 110 - (y + 70)) / 60) + 1);
  const shown = rows.length > room ? rows.slice(0, room - 1) : rows;
  y += 70;
  for (const r of shown) {
    ctx.textAlign = "left";
    ctx.fillStyle = c.text;
    ctx.font = `500 40px ${body}`;
    ctx.fillText(r.name, margin, y, maxW - 300);
    ctx.textAlign = "right";
    ctx.font = `700 44px ${display}`;
    ctx.fillText(r.value, W - margin, y, 290);
    y += 60;
  }
  if (shown.length < rows.length) {
    ctx.textAlign = "left";
    ctx.fillStyle = c.muted;
    ctx.font = `500 34px ${body}`;
    ctx.fillText(`+${rows.length - shown.length} gerakan lainnya`, margin, y);
  }
  await footer(ctx, c, body, memberName, margin);
}

export interface ListCard {
  eyebrow: string;
  title: string;
  rows: { name: string; value: string; pr?: boolean }[];
  /** Rows not shown ("+N gerakan lainnya"). */
  more?: string;
}

/** "Gerakan": up to seven movements with their best set, records marked. */
export async function drawListCard(canvas: HTMLCanvasElement, card: ListCard, ink: CardInk, memberName: string) {
  const { ctx, c, display, body, W, margin } = await startCard(canvas, ink);
  let y = heading(ctx, c, display, body, card.eyebrow, card.title, margin) + 110;
  for (const r of card.rows.slice(0, 7)) {
    ctx.textAlign = "left";
    ctx.fillStyle = c.text;
    ctx.font = `600 46px ${body}`;
    ctx.fillText(r.name + (r.pr ? " 🏆" : ""), margin, y, W - margin * 2 - 310);
    ctx.textAlign = "right";
    ctx.fillStyle = r.pr ? c.accent : c.text;
    ctx.font = `700 54px ${display}`;
    ctx.fillText(r.value, W - margin, y, 300);
    y += 112;
  }
  if (card.more) {
    ctx.textAlign = "left";
    ctx.fillStyle = c.muted;
    ctx.font = `500 36px ${body}`;
    ctx.fillText(card.more, margin, y - 24);
  }
  await footer(ctx, c, body, memberName, margin);
}

export interface WeekCard {
  eyebrow: string;
  /** Days trained, 0 = Monday … 6 = Sunday. */
  days: number[];
  /** The day being shared (gets a ring). */
  today: number;
}

const WEEKDAY = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** "Minggu ini": how many days this week, and a dot per day. */
export async function drawWeekCard(canvas: HTMLCanvasElement, card: WeekCard, ink: CardInk, memberName: string) {
  const { ctx, c, display, body, W, margin } = await startCard(canvas, ink);
  const count = new Set(card.days).size;
  ctx.textAlign = "center";
  ctx.fillStyle = c.muted;
  ctx.font = `600 38px ${body}`;
  ctx.fillText(card.eyebrow.toUpperCase().slice(0, 40), W / 2, 190);
  ctx.fillStyle = c.text;
  ctx.font = `700 330px ${display}`;
  ctx.fillText(String(count), W / 2, 590);
  ctx.fillStyle = c.accent;
  ctx.font = `700 64px ${display}`;
  ctx.fillText("HARI LATIHAN MINGGU INI", W / 2, 690, W - margin * 2);

  const gap = (W - margin * 2) / 7;
  const r = 40;
  for (let i = 0; i < 7; i++) {
    const x = margin + gap * (i + 0.5);
    const y = 880;
    const on = card.days.includes(i);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (on) {
      ctx.fillStyle = c.accent;
      ctx.fill();
    } else {
      ctx.lineWidth = 5;
      ctx.strokeStyle = c.muted;
      ctx.stroke();
    }
    if (i === card.today) {
      ctx.beginPath();
      ctx.arc(x, y, r + 12, 0, Math.PI * 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = c.text;
      ctx.stroke();
    }
    ctx.fillStyle = on ? c.text : c.muted;
    ctx.font = `600 32px ${body}`;
    ctx.fillText(WEEKDAY[i], x, y + r + 62);
  }
  ctx.fillStyle = c.text;
  ctx.font = `500 44px ${body}`;
  ctx.fillText(count >= 3 ? "Konsisten seperti dewa Olympus ⚡" : count === 1 ? "Langkah pertama minggu ini 💪" : "Terus jaga ritmenya 💪", W / 2, 1110, W - margin * 2);
  await footer(ctx, c, body, memberName, margin);
}

export interface MuscleCard {
  eyebrow: string;
  title: string;
  /** Top muscles with their share of the day's sets (0–1). */
  muscles: { label: string; sets: number; share: number }[];
}

const formatSets = (n: number) => String(n).replace(".", ",");

/** "Fokus otot": front and back figure with the worked muscles lit, the top three under them. */
export async function drawMuscleCard(canvas: HTMLCanvasElement, figures: (HTMLImageElement | null)[], card: MuscleCard, ink: CardInk, memberName: string) {
  const { ctx, c, display, body, W, margin } = await startCard(canvas, ink);
  const top = heading(ctx, c, display, body, card.eyebrow, card.title, margin) + 20;
  const figH = 640;
  const figW = (figH * 200) / 380;
  const fx = (W - (figW * 2 + 40)) / 2;
  ctx.shadowBlur = 0;
  figures.forEach((f, i) => f && ctx.drawImage(f, fx + i * (figW + 40), top, figW, figH));
  ctx.shadowBlur = 18;
  const colW = (W - margin * 2 - 60) / 3;
  card.muscles.slice(0, 3).forEach((m, i) => {
    const x = margin + i * (colW + 30);
    const y = top + figH + 90;
    ctx.textAlign = "left";
    ctx.fillStyle = c.text;
    ctx.font = `600 ${fitSize(ctx, m.label, (px) => `600 ${px}px ${body}`, 40, colW)}px ${body}`;
    ctx.fillText(m.label, x, y, colW);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = c.muted;
    ctx.fillRect(x, y + 26, colW, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.accent;
    ctx.fillRect(x, y + 26, Math.max(16, colW * m.share), 16);
    ctx.fillStyle = c.muted;
    ctx.font = `600 32px ${body}`;
    ctx.fillText(`${formatSets(m.sets)} set`, x, y + 88);
  });
  await footer(ctx, c, body, memberName, margin);
}

/** Biru: the Olympus background · Bening: transparent, with a see-through dark panel · Terang: light. */
export type Backdrop = "biru" | "bening" | "terang";

export const inkFor = (b: Backdrop): CardInk => (b === "terang" ? "dark" : "light");

/** Paints the card's backdrop under its drawn layer. */
export function fillBackdrop(ctx: CanvasRenderingContext2D, backdrop: Backdrop) {
  const W = CARD_W;
  const H = CARD_H;
  ctx.clearRect(0, 0, W, H);
  if (backdrop === "bening") {
    ctx.fillStyle = "rgba(11, 18, 32, 0.58)";
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 56);
    ctx.fill();
    return;
  }
  const light = backdrop === "terang";
  ctx.fillStyle = light ? "#f8fafc" : "#0b1220";
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.08, 0, W / 2, H * 0.08, H * 0.85);
  g.addColorStop(0, light ? "rgba(37, 99, 235, 0.20)" : "rgba(37, 99, 235, 0.75)");
  g.addColorStop(1, "rgba(37, 99, 235, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
