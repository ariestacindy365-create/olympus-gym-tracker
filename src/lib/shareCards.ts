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

  y += 78;
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
