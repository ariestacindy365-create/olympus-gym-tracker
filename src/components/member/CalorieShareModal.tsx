"use client";

import { useEffect, useRef, useState } from "react";
import fixWebmDuration from "fix-webm-duration";
import { shareOrDownload } from "@/lib/shareFile";
import { pickVideoMimeType } from "@/lib/videoFormat";
import { foodEquivalent, type CalorieEstimate } from "@/lib/calories";

export interface CalorieShareModalProps {
  cal: CalorieEstimate;
  title: string;
  /** "45m · 3.360 kg" */
  stats: string;
  memberName: string;
  onClose: () => void;
}

const W = 1080;
const H = 1920;
/** Length of the animation; the still image is its last frame. */
export const CALORIE_STORY_SEC = 6;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
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

// [x offset, height, width, lean] of each tongue; fixed so every card matches.
const BACK = [
  [-250, 300, 120, -40],
  [-180, 380, 130, -25],
  [-95, 330, 120, -10],
  [0, 250, 130, 8],
  [95, 340, 120, 12],
  [180, 390, 130, 28],
  [250, 290, 120, 42],
];
const FRONT = [
  [-160, 150, 95, -12],
  [-55, 120, 90, 6],
  [55, 135, 90, -6],
  [160, 155, 95, 14],
];
const LAYERS: [number, string, string][] = [
  [1, "#dc2626", "#f97316"],
  [0.72, "#f97316", "#fb923c"],
  [0.45, "#facc15", "#fef08a"],
];

/**
 * A bed of fire around the food at (cx, cy) at time t: tall tongues wrapping
 * the sides, shorter ones in the middle, each layered red → orange → yellow
 * and flickering. `grow` (0–1) lets the fire rise at the start; `front`
 * draws the small tongues that lick over the bottom of the food.
 */
function flames(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, grow: number, front: boolean) {
  const baseY = cy + (front ? 150 : 140);
  (front ? FRONT : BACK).forEach(([dx, h, w, lean], i) => {
    const flicker = 1 + 0.09 * Math.sin(t * 9 + i * 1.7) + 0.05 * Math.sin(t * 15.3 + i * 2.9);
    const sway = lean + 14 * Math.sin(t * 6.1 + i * 1.3);
    for (const [k, c0, c1] of LAYERS) {
      const hh = h * k * flicker * grow;
      if (hh < 2) continue;
      const g = ctx.createLinearGradient(0, baseY, 0, baseY - hh);
      g.addColorStop(0, c1);
      g.addColorStop(1, c0);
      tongue(ctx, cx + dx, baseY, w * k * Math.max(0.3, grow), hh, sway * k, g);
    }
  });
}

/** Embers drifting up out of the fire, looping. */
function embers(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, grow: number) {
  for (let i = 0; i < 14; i++) {
    const rise = (t * (160 + (i % 5) * 40) + i * 97) % 520;
    const x = cx + ((i * 151) % 640) - 320 + 18 * Math.sin(t * 3 + i);
    const a = Math.max(0, 1 - rise / 520) * grow;
    ctx.fillStyle = `rgba(253,186,116,${(0.9 * a).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, cy + 120 - rise, 3 + (i % 4) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Grey smoke rising from the food once it starts burning. */
function smoke(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, amount: number) {
  if (amount <= 0) return;
  for (let i = 0; i < 6; i++) {
    const rise = (t * 90 + i * 70) % 420;
    ctx.fillStyle = `rgba(148,163,184,${(0.22 * amount * (1 - rise / 420)).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(cx + 40 * Math.sin(t * 1.4 + i * 2), cy - 140 - rise, 30 + rise * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The food emoji drawn once into its own canvas, plus a scratch canvas to
// char it: a dark brown fill "source-atop" only covers the food's own pixels.
// (ctx.filter would be simpler, but it drops colour emoji in Chrome and
// Safari doesn't support it at all.)
const SPRITE = 320;
let sprite: { emoji: string; base: HTMLCanvasElement; work: HTMLCanvasElement } | null = null;
function foodSprite(emoji: string, font: string, burn: number): HTMLCanvasElement {
  if (sprite?.emoji !== emoji) {
    const base = document.createElement("canvas");
    base.width = base.height = SPRITE;
    const b = base.getContext("2d")!;
    b.textAlign = "center";
    b.textBaseline = "middle";
    b.font = `250px ${font}`;
    b.fillText(emoji, SPRITE / 2, SPRITE / 2 + 10);
    const work = document.createElement("canvas");
    work.width = work.height = SPRITE;
    sprite = { emoji, base, work };
  }
  const w = sprite.work.getContext("2d")!;
  w.globalCompositeOperation = "source-over";
  w.clearRect(0, 0, SPRITE, SPRITE);
  w.drawImage(sprite.base, 0, 0);
  if (burn > 0) {
    w.globalCompositeOperation = "source-atop";
    w.fillStyle = `rgba(48,24,8,${(0.55 * burn).toFixed(3)})`;
    w.fillRect(0, 0, SPRITE, SPRITE);
  }
  return sprite.work;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;

/**
 * One frame of the calorie story at t seconds: the fire rises and the kcal
 * counts up (0–1.4 s), the food chars and shrinks under smoke (1.2–4.5 s),
 * "setara …" fades in (2.6–3.8 s), then everything holds.
 */
function drawCalorieFrame(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, p: CalorieShareModalProps, t: number) {
  const { display, body } = fontFamilies();
  const { main, alt } = foodEquivalent(p.cal.kcal);
  const grow = easeOut(t / 1.2);
  const burn = easeOut((t - 1.2) / 3.3);

  // Night-navy story background with a warm, pulsing glow behind the fire.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0d1d42");
  bg.addColorStop(1, "#050b1c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 1060, 40, W / 2, 1060, 640);
  glow.addColorStop(0, `rgba(249,115,22,${((0.5 + 0.06 * Math.sin(t * 7)) * grow).toFixed(3)})`);
  glow.addColorStop(1, "rgba(249,115,22,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  if (logo) {
    const h = 72;
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, (W - w) / 2, 140, w, h);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 40px ${body}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "8px";
  ctx.fillText("KALORI TERBAKAR", W / 2, 350);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  const shown = Math.round((p.cal.kcal * easeOut(t / 1.4)) / 10) * 10;
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 260px ${display}`;
  ctx.fillText(`±${shown.toLocaleString("id-ID")}`, W / 2, 590);
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

  // The food, burning: fire behind it, the food (charring and shrinking),
  // smoke, then small flames in front.
  const foodY = 1070;
  const drop = easeOut(t / 0.8);
  flames(ctx, W / 2, foodY, t, grow, false);
  embers(ctx, W / 2, foodY, t, grow);
  smoke(ctx, W / 2, foodY, t, burn);
  ctx.save();
  ctx.globalAlpha = drop;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 30;
  const size = SPRITE * (1 - 0.18 * burn);
  ctx.drawImage(foodSprite(main.emoji, body, burn), W / 2 - size / 2, foodY - 120 * (1 - drop) - size / 2, size, size);
  ctx.restore();
  flames(ctx, W / 2, foodY, t, grow, true);

  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = easeOut((t - 2.6) / 0.7);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `500 46px ${body}`;
  ctx.fillText("yang kamu bakar setara", W / 2, 1330);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 76px ${display}`;
  const mainLines = wrap(ctx, main.text.toUpperCase(), W - 160);
  mainLines.forEach((l, i) => ctx.fillText(l, W / 2, 1420 + i * 84));
  if (alt) {
    ctx.globalAlpha = easeOut((t - 3.2) / 0.6);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `500 42px ${body}`;
    ctx.fillText(`atau ${alt.text} ${alt.emoji}`, W / 2, 1430 + mainLines.length * 84 + 20);
  }
  ctx.globalAlpha = 1;

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

/** "🔥 Kartu kalori": the calories burned and their food equivalent as a 1080×1920 story video or image. */
export function CalorieShareModal(props: CalorieShareModalProps) {
  const { cal, title, onClose } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const recordingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [canVideo, setCanVideo] = useState(false);
  const [pending, setPending] = useState<"image" | "video" | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  // navigator.share() needs a fresh tap, so the video is built on the first
  // tap and shared on a second one (same as the volume story).
  const [video, setVideo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { main } = foodEquivalent(cal.kcal);
  const caption = `Latihan di OLYMPUS Lifting Club, bakar ±${cal.kcal.toLocaleString("id-ID")} kcal, setara ${main.text} ${main.emoji} (estimasi) 🔥`;

  useEffect(() => {
    let cancelled = false;
    Promise.all([document.fonts?.ready, loadImage("/olympus-logo-light-bw.png").catch(() => null)]).then(([, logo]) => {
      if (cancelled) return;
      logoRef.current = logo;
      setCanVideo(!!pickVideoMimeType() && typeof HTMLCanvasElement.prototype.captureStream === "function");
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Looping live preview, paused while a recording mirrors into it.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!ready || !canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      if (!recordingRef.current) drawCalorieFrame(ctx, logoRef.current, props, ((now - start) / 1000) % (CALORIE_STORY_SEC + 1.5));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // props is a fresh object every render; restart only when the numbers change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cal.kcal, title]);

  function offscreen() {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    return { canvas, ctx: canvas.getContext("2d")! };
  }

  async function shareImage() {
    setPending("image");
    setError(null);
    try {
      const { canvas, ctx } = offscreen();
      drawCalorieFrame(ctx, logoRef.current, props, CALORIE_STORY_SEC);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png"));
      await shareOrDownload(new File([blob], "olympus-kalori.png", { type: "image/png" }), caption);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setError("Gagal membagikan. Coba lagi.");
    } finally {
      setPending(null);
    }
  }

  async function buildVideo() {
    setPending("video");
    setError(null);
    try {
      // MP4 (H.264) first: WhatsApp and Android's share sheet reject WebM.
      const mimeType = pickVideoMimeType();
      if (!mimeType) throw new Error("Video tidak didukung di HP ini.");
      const { canvas, ctx } = offscreen();
      drawCalorieFrame(ctx, logoRef.current, props, 0);
      const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 6_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
      });
      const preview = canvasRef.current?.getContext("2d") ?? null;
      // Hold the last frame a moment so it isn't cut off.
      const total = CALORIE_STORY_SEC + 0.5;
      recordingRef.current = true;
      const start = performance.now();
      recorder.start();
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          const t = (now - start) / 1000;
          drawCalorieFrame(ctx, logoRef.current, props, Math.min(t, CALORIE_STORY_SEC));
          preview?.drawImage(canvas, 0, 0);
          setProgress(Math.min(99, Math.floor((t / total) * 100)));
          if (t < total) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      const elapsedMs = performance.now() - start;
      recorder.stop();
      const raw = await done;
      const blob = mimeType.startsWith("video/webm") ? await fixWebmDuration(raw, elapsedMs, { logger: false }) : raw;
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      setVideo(new File([blob], `olympus-kalori.${ext}`, { type: mimeType.split(";")[0] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat video.");
    } finally {
      recordingRef.current = false;
      setProgress(null);
      setPending(null);
    }
  }

  async function shareVideo() {
    if (!video) return;
    try {
      await shareOrDownload(video, caption);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setError("Gagal membagikan. Coba lagi.");
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
        <canvas
          ref={canvasRef}
          className="mx-auto block aspect-[9/16] h-auto w-full max-w-[300px] rounded-xl bg-[#0d1d42]"
          aria-label={`Kartu kalori ${title}`}
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {canVideo &&
          (video ? (
            <button type="button" onClick={shareVideo} className="mt-3 h-12 rounded-xl bg-[#22c55e] font-bold text-white">
              📤 Bagikan video
            </button>
          ) : (
            <button
              type="button"
              onClick={buildVideo}
              disabled={!ready || pending !== null}
              className="mt-3 h-12 rounded-xl bg-accent font-bold text-white hover:bg-accent-2 disabled:opacity-60"
            >
              {progress !== null ? `Merekam video… ${progress}%` : "🎬 Buat video (6 detik)"}
            </button>
          ))}
        <button
          type="button"
          onClick={shareImage}
          disabled={!ready || pending !== null}
          className={`mt-2 h-11 rounded-xl text-sm font-semibold disabled:opacity-60 ${
            canVideo ? "border border-border bg-surface hover:bg-surface-2" : "bg-accent text-white"
          }`}
        >
          {pending === "image" ? "Menyiapkan…" : "🖼️ Bagikan gambar"}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted">Ukuran story 9:16 untuk Instagram &amp; WhatsApp. Kalori hanya estimasi.</p>
      </div>
    </div>
  );
}
