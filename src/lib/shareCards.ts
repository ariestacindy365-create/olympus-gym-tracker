// The simple share cards (one big number and what it means), drawn on a
// transparent 1080×1080 canvas like the workout sticker, so every card on
// the share screen can sit on a photo or on the Olympus background.

export const CARD_SIZE = 1080;

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
  light: { text: "#ffffff", muted: "rgba(255,255,255,0.75)", accent: "#60a5fa", shadow: "rgba(0,0,0,0.45)", logo: "/olympus-logo-light-bw.png" },
  dark: { text: "#0b1220", muted: "rgba(11,18,32,0.68)", accent: "#2563eb", shadow: "rgba(255,255,255,0.5)", logo: "/olympus-logo-bw.png" },
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

export async function drawStatCard(canvas: HTMLCanvasElement, card: StatCard, ink: CardInk, memberName: string) {
  await document.fonts?.ready;
  const c = INK[ink];
  const { display, body } = fontFamilies();
  const S = CARD_SIZE;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // A soft glow keeps the text readable on busy photos.
  ctx.shadowColor = c.shadow;
  ctx.shadowBlur = 18;
  const margin = 80;
  const maxW = S - margin * 2;

  ctx.fillStyle = c.muted;
  ctx.font = `600 38px ${body}`;
  ctx.fillText(card.eyebrow.toUpperCase().slice(0, 40), S / 2, 150, maxW);

  let y = 250;
  if (card.emoji) {
    ctx.font = `150px ${body}`;
    ctx.fillText(card.emoji, S / 2, y + 120);
    y += 170;
  }

  const bigFont = (px: number) => `700 ${px}px ${display}`;
  const bigPx = fitSize(ctx, card.big, bigFont, card.emoji ? 230 : 280, maxW);
  y += bigPx * 0.9 + (card.emoji ? 10 : 60);
  ctx.fillStyle = c.text;
  ctx.fillText(card.big, S / 2, y);

  // Clear of descenders ("70 kg").
  y += card.emoji ? 96 : 78;
  ctx.fillStyle = c.accent;
  ctx.font = `700 56px ${display}`;
  ctx.fillText(card.unit.toUpperCase(), S / 2, y, maxW);

  if (card.sub) {
    ctx.fillStyle = c.text;
    ctx.font = `500 40px ${body}`;
    for (const line of wrap(ctx, card.sub, maxW)) {
      y += 58;
      ctx.fillText(line, S / 2, y);
    }
  }

  if (card.stats?.length) {
    const n = card.stats.length;
    const colW = maxW / n;
    card.stats.forEach((s, i) => {
      const x = margin + colW * (i + 0.5);
      ctx.fillStyle = c.text;
      ctx.font = `700 ${fitSize(ctx, s.value, (px) => `700 ${px}px ${display}`, 76, colW - 20)}px ${display}`;
      ctx.fillText(s.value, x, 850);
      ctx.fillStyle = c.muted;
      ctx.font = `500 32px ${body}`;
      ctx.fillText(s.label, x, 898, colW - 12);
    });
  }

  // Footer: logo left, member right.
  const logo = await loadImage(c.logo);
  if (logo) {
    const h = 64;
    ctx.drawImage(logo, margin, S - margin - h + 8, (logo.width / logo.height) * h, h);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = c.muted;
  ctx.font = `600 34px ${body}`;
  ctx.fillText(memberName, S - margin, S - margin, maxW / 2);
}

/** The Olympus backdrop for a card that isn't going on a photo. */
export function fillOlympusBackground(ctx: CanvasRenderingContext2D) {
  const S = CARD_SIZE;
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, S, S);
  const g = ctx.createRadialGradient(S / 2, S * 0.1, 0, S / 2, S * 0.1, S * 0.95);
  g.addColorStop(0, "rgba(37, 99, 235, 0.75)");
  g.addColorStop(1, "rgba(37, 99, 235, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
}

/** Shared setup for the drawn cards: size, glow, fonts. */
async function startCard(canvas: HTMLCanvasElement, ink: CardInk) {
  await document.fonts?.ready;
  const S = CARD_SIZE;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = INK[ink].shadow;
  ctx.shadowBlur = 18;
  return { ctx, c: INK[ink], ...fontFamilies(), S, margin: 80 };
}

async function footer(ctx: CanvasRenderingContext2D, c: (typeof INK)["light"], body: string, memberName: string, margin: number) {
  const S = CARD_SIZE;
  const logo = await loadImage(c.logo);
  if (logo) {
    const h = 64;
    ctx.drawImage(logo, margin, S - margin - h + 8, (logo.width / logo.height) * h, h);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = c.muted;
  ctx.font = `600 34px ${body}`;
  ctx.fillText(memberName, S - margin, S - margin, (S - margin * 2) / 2);
}

function heading(ctx: CanvasRenderingContext2D, c: (typeof INK)["light"], display: string, body: string, eyebrow: string, title: string, margin: number) {
  const maxW = CARD_SIZE - margin * 2;
  ctx.textAlign = "left";
  ctx.fillStyle = c.muted;
  ctx.font = `600 36px ${body}`;
  ctx.fillText(eyebrow.toUpperCase().slice(0, 44), margin, 140, maxW);
  ctx.fillStyle = c.text;
  const px = fitSize(ctx, title, (p) => `700 ${p}px ${display}`, 104, maxW);
  ctx.font = `700 ${px}px ${display}`;
  ctx.fillText(title, margin, 140 + px * 0.95 + 14, maxW);
  return 140 + px + 40;
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
  const { ctx, c, display, body, S, margin } = await startCard(canvas, ink);
  let y = heading(ctx, c, display, body, card.eyebrow, card.title, margin) + 80;
  const rows = card.rows.slice(0, 7);
  const rowH = rows.length > 5 ? 76 : 88;
  for (const r of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = c.text;
    ctx.font = `600 44px ${body}`;
    const name = r.name + (r.pr ? " 🏆" : "");
    ctx.fillText(name, margin, y, S - margin * 2 - 300);
    ctx.textAlign = "right";
    ctx.fillStyle = r.pr ? c.accent : c.text;
    ctx.font = `700 50px ${display}`;
    ctx.fillText(r.value, S - margin, y, 290);
    y += rowH;
  }
  if (card.more) {
    ctx.textAlign = "left";
    ctx.fillStyle = c.muted;
    ctx.font = `500 34px ${body}`;
    ctx.fillText(card.more, margin, y - 16);
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

const formatSets = (n: number) => String(n).replace(".", ",");

const WEEKDAY = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** "Minggu ini": how many days this week, and a dot per day. */
export async function drawWeekCard(canvas: HTMLCanvasElement, card: WeekCard, ink: CardInk, memberName: string) {
  const { ctx, c, display, body, S, margin } = await startCard(canvas, ink);
  const count = new Set(card.days).size;
  ctx.textAlign = "center";
  ctx.fillStyle = c.muted;
  ctx.font = `600 38px ${body}`;
  ctx.fillText(card.eyebrow.toUpperCase().slice(0, 40), S / 2, 150);
  ctx.fillStyle = c.text;
  ctx.font = `700 300px ${display}`;
  ctx.fillText(String(count), S / 2, 470);
  ctx.fillStyle = c.accent;
  ctx.font = `700 60px ${display}`;
  ctx.fillText("HARI LATIHAN MINGGU INI", S / 2, 560, S - margin * 2);

  const gap = (S - margin * 2) / 7;
  const r = 40;
  for (let i = 0; i < 7; i++) {
    const x = margin + gap * (i + 0.5);
    const y = 700;
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
  ctx.font = `500 40px ${body}`;
  ctx.fillText(count >= 3 ? "Konsisten seperti dewa Olympus ⚡" : count === 1 ? "Langkah pertama minggu ini 💪" : "Terus jaga ritmenya 💪", S / 2, 890, S - margin * 2);
  await footer(ctx, c, body, memberName, margin);
}

export interface MuscleCard {
  eyebrow: string;
  title: string;
  /** Top muscles with their share of the day's sets (0–1). */
  muscles: { label: string; sets: number; share: number }[];
}

/** "Fokus otot": front and back figure with the worked muscles lit, plus the top three. */
export async function drawMuscleCard(canvas: HTMLCanvasElement, figures: (HTMLImageElement | null)[], card: MuscleCard, ink: CardInk, memberName: string) {
  const { ctx, c, display, body, S, margin } = await startCard(canvas, ink);
  const top = heading(ctx, c, display, body, card.eyebrow, card.title, margin);
  const figH = Math.min(560, S - margin - 110 - top);
  const figW = (figH * 200) / 380;
  ctx.shadowBlur = 0;
  figures.forEach((f, i) => f && ctx.drawImage(f, margin - 10 + i * (figW + 8), top, figW, figH));
  ctx.shadowBlur = 18;
  const x = margin + figW * 2 + 50;
  const w = S - margin - x;
  card.muscles.slice(0, 3).forEach((m, i) => {
    const y = top + 60 + i * 180;
    ctx.textAlign = "left";
    ctx.fillStyle = c.text;
    ctx.font = `600 ${fitSize(ctx, m.label, (px) => `600 ${px}px ${body}`, 44, w)}px ${body}`;
    ctx.fillText(m.label, x, y, w);
    ctx.fillStyle = c.muted;
    ctx.font = `600 32px ${body}`;
    ctx.fillText(`${formatSets(m.sets)} set`, x, y + 90);
    ctx.fillStyle = c.muted;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, y + 24, w, 18);
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.accent;
    ctx.fillRect(x, y + 24, Math.max(18, w * m.share), 18);
  });
  await footer(ctx, c, body, memberName, margin);
}
