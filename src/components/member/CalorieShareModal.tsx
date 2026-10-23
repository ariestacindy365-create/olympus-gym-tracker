"use client";

import { useEffect, useRef, useState } from "react";
import { shareOrDownload } from "@/lib/shareFile";
import { foodEquivalent, type CalorieEstimate } from "@/lib/calories";

interface CalorieShareModalProps {
  cal: CalorieEstimate;
  title: string;
  /** "45m · 3.360 kg" */
  stats: string;
  memberName: string;
  onClose: () => void;
}

const W = 1080;
const H = 1920;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fontFamilies() {
  const probe = document.createElement("span");
  probe.className = "font-display";
  document.body.appendChild(probe);
  const display = getComputedStyle(probe).fontFamily;
  probe.remove();
  return { display, body: getComputedStyle(document.body).fontFamily };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** One flame tongue from (x, baseY) up to its tip; `lean` bends the tip sideways. */
function tongue(ctx: CanvasRenderingContext2D, x: number, baseY: number, w: number, h: number, lean: number, fill: string | CanvasGradient) {
  const tipX = x + lean;
  ctx.beginPath();
  ctx.moveTo(tipX, baseY - h);
  ctx.bezierCurveTo(x + w * 0.15 + lean * 0.4, baseY - h * 0.55, x + w * 0.95, baseY - h * 0.35, x + w * 0.55, baseY);
  ctx.quadraticCurveTo(x, baseY + w * 0.25, x - w * 0.55, baseY);
  ctx.bezierCurveTo(x - w * 0.95, baseY - h * 0.35, x - w * 0.15 + lean * 0.4, baseY - h * 0.55, tipX, baseY - h);
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * A bed of fire around the food at (cx, cy): tall tongues wrapping the
 * sides, shorter ones in the middle, each layered red → orange → yellow.
 * `front` draws the small tongues that lick over the bottom of the food.
 */
function flames(ctx: CanvasRenderingContext2D, cx: number, cy: number, front: boolean) {
  // Fixed layout (not random) so the card looks the same every time.
  const back = [
    [-250, 300, 120, -40],
    [-180, 380, 130, -25],
    [-95, 330, 120, -10],
    [0, 250, 130, 8],
    [95, 340, 120, 12],
    [180, 390, 130, 28],
    [250, 290, 120, 42],
  ];
  const fore = [
    [-160, 150, 95, -12],
    [-55, 120, 90, 6],
    [55, 135, 90, -6],
    [160, 155, 95, 14],
  ];
  const baseY = cy + (front ? 150 : 140);
  for (const [dx, h, w, lean] of front ? fore : back) {
    const x = cx + dx;
    const layers: [number, string, string][] = [
      [1, "#dc2626", "#f97316"],
      [0.72, "#f97316", "#fb923c"],
      [0.45, "#facc15", "#fef08a"],
    ];
    for (const [k, c0, c1] of layers) {
      const g = ctx.createLinearGradient(0, baseY, 0, baseY - h * k);
      g.addColorStop(0, c1);
      g.addColorStop(1, c0);
      tongue(ctx, x, baseY, w * k, h * k, lean * k, g);
    }
  }
  if (!front) {
    // Embers drifting up.
    ctx.fillStyle = "rgba(253,186,116,0.85)";
    for (const [dx, dy, r] of [[-300, -260, 7], [-210, -360, 5], [230, -380, 6], [310, -230, 8], [-60, -300, 4], [120, -330, 5]]) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

async function drawCard(canvas: HTMLCanvasElement, p: CalorieShareModalProps) {
  await document.fonts?.ready;
  const { display, body } = fontFamilies();
  const { main, alt } = foodEquivalent(p.cal.kcal);
  const ctx = canvas.getContext("2d")!;
  canvas.width = W;
  canvas.height = H;

  // Night-navy story background with a warm glow behind the number.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0d1d42");
  bg.addColorStop(1, "#050b1c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 1060, 40, W / 2, 1060, 640);
  glow.addColorStop(0, "rgba(249,115,22,0.55)");
  glow.addColorStop(1, "rgba(249,115,22,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const logo = await loadImage("/olympus-logo-light-bw.png").catch(() => null);
  if (logo) {
    const h = 72;
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, (W - w) / 2, 140, w, h);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 40px ${body}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "8px";
  ctx.fillText("KALORI TERBAKAR", W / 2, 350);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 260px ${display}`;
  ctx.fillText(`±${p.cal.kcal.toLocaleString("id-ID")}`, W / 2, 590);
  ctx.font = `700 80px ${display}`;
  ctx.fillText("KCAL", W / 2, 680);

  // "ESTIMASI" pill: the number is never presented as exact.
  ctx.font = `700 32px ${body}`;
  const pill = "ESTIMASI";
  const pw = ctx.measureText(pill).width + 48;
  ctx.fillStyle = "rgba(249,115,22,0.25)";
  ctx.beginPath();
  ctx.roundRect((W - pw) / 2, 715, pw, 56, 28);
  ctx.fill();
  ctx.fillStyle = "#fdba74";
  ctx.fillText(pill, W / 2, 755);

  // The food, burning: fire behind it, the food, then small flames in front.
  const foodY = 1070;
  flames(ctx, W / 2, foodY, false);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 30;
  ctx.textBaseline = "middle";
  ctx.font = `250px ${body}`;
  ctx.fillText(main.emoji, W / 2, foodY);
  ctx.restore();
  flames(ctx, W / 2, foodY, true);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `500 46px ${body}`;
  ctx.fillText("yang kamu bakar setara", W / 2, 1330);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 76px ${display}`;
  const mainLines = wrap(ctx, main.text.toUpperCase(), W - 160);
  mainLines.forEach((l, i) => ctx.fillText(l, W / 2, 1420 + i * 84));
  if (alt) {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `500 42px ${body}`;
    ctx.fillText(`atau ${alt.text} ${alt.emoji}`, W / 2, 1430 + mainLines.length * 84 + 20);
  }

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(140, 1640, W - 280, 3);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 52px ${display}`;
  ctx.fillText(`${p.title.toUpperCase()} · ${p.memberName}`.slice(0, 48), W / 2, 1720);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `500 34px ${body}`;
  ctx.fillText(p.stats, W / 2, 1775);
  ctx.font = `400 28px ${body}`;
  ctx.fillText("Estimasi dari durasi & berat badan, bukan angka pasti", W / 2, 1830);
  ctx.textAlign = "left";
}

/** "🔥 Kartu kalori": a 1080×1920 story image of the calories burned and their food equivalent. */
export function CalorieShareModal(props: CalorieShareModalProps) {
  const { cal, title, onClose } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { main } = foodEquivalent(cal.kcal);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawCard(canvasRef.current, props).catch(() => setError("Gagal menggambar kartu."));
    // props is a fresh object every render; redraw only when the numbers change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cal.kcal, title]);

  async function share() {
    setPending(true);
    setError(null);
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvasRef.current ? canvasRef.current.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png") : reject(new Error("no canvas"))
      );
      const file = new File([blob], "olympus-kalori.png", { type: "image/png" });
      await shareOrDownload(file, `Latihan di OLYMPUS Lifting Club, bakar ±${cal.kcal.toLocaleString("id-ID")} kcal, setara ${main.text} ${main.emoji} (estimasi) 🔥`);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setError("Gagal membagikan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center" role="dialog" aria-modal="true" aria-label="Kartu kalori">
      <div className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-4 shadow-overlay [&>*]:shrink-0 sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-base font-bold uppercase tracking-wide">Kartu kalori</p>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-xl text-muted hover:text-foreground">
            ×
          </button>
        </div>
        <canvas ref={canvasRef} className="mx-auto block h-auto w-full max-w-[300px] rounded-xl" aria-label={`Kartu kalori ${title}`} />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <button type="button" onClick={share} disabled={pending} className="mt-3 h-12 rounded-xl bg-accent font-bold text-white hover:bg-accent-2 disabled:opacity-60">
          {pending ? "Menyiapkan…" : "📤 Bagikan ke Story / WhatsApp"}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted">Ukuran story 9:16. Kalori hanya estimasi.</p>
      </div>
    </div>
  );
}
