"use client";

import { useEffect, useRef, useState } from "react";
import { MuscleMap } from "@/components/shared/MuscleMap";
import { shareOrDownload } from "@/lib/shareFile";
import type { MuscleKey } from "@/lib/muscles";

interface StickerLine {
  exercise: string;
  sets: number;
}

interface WorkoutStickerModalProps {
  title: string;
  lines: StickerLine[];
  levels: Partial<Record<MuscleKey, number>>;
  /** Small line under the title, e.g. "1.620 kg · 45m". */
  stats?: string;
  memberName: string;
  onClose: () => void;
}

const SIZE = 1080;
const MAX_LINES = 8;
type Ink = "light" | "dark";
const INK = {
  light: { text: "#ffffff", muted: "rgba(255,255,255,0.72)", accent: "#3b82f6", shadow: "rgba(0,0,0,0.45)", logo: "/olympus-logo-light.png" },
  dark: { text: "#0b1220", muted: "rgba(11,18,32,0.65)", accent: "#2563eb", shadow: "rgba(255,255,255,0.5)", logo: "/olympus-logo.png" },
};

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

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** The front/back figures from the hidden MuscleMap, as self-contained SVG images. */
async function figureImages(host: HTMLElement) {
  const svgs = [...host.querySelectorAll("svg")];
  return Promise.all(
    svgs.map((svg) => {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", "200");
      clone.setAttribute("height", "380");
      clone.removeAttribute("class");
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
      return loadImage(url).finally(() => URL.revokeObjectURL(url));
    })
  );
}

async function drawSticker(canvas: HTMLCanvasElement, host: HTMLElement, p: WorkoutStickerModalProps, ink: Ink) {
  await document.fonts?.ready;
  const c = INK[ink];
  const { display, body } = fontFamilies();
  const ctx = canvas.getContext("2d")!;
  canvas.width = SIZE;
  canvas.height = SIZE;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.textBaseline = "alphabetic";
  // A soft glow keeps the text readable on busy photos.
  ctx.shadowColor = c.shadow;
  ctx.shadowBlur = 18;

  const left = 70;
  const textWidth = 680;
  ctx.fillStyle = c.text;
  ctx.font = `700 76px ${display}`;
  ctx.fillText(fit(ctx, p.title.toUpperCase(), textWidth), left, 205);
  if (p.stats) {
    ctx.fillStyle = c.muted;
    ctx.font = `500 34px ${body}`;
    ctx.fillText(fit(ctx, p.stats, textWidth), left, 258);
  }

  const shown = p.lines.slice(0, MAX_LINES);
  const rest = p.lines.length - shown.length;
  const top = p.stats ? 345 : 320;
  const step = shown.length + (rest > 0 ? 1 : 0) > 7 ? 66 : 74;
  shown.forEach((l, i) => {
    const y = top + i * step;
    const count = `${l.sets}x`;
    ctx.fillStyle = c.accent;
    ctx.font = `700 46px ${body}`;
    ctx.fillText(count, left, y);
    const nameX = left + Math.max(78, ctx.measureText(count).width + 22);
    ctx.fillStyle = c.text;
    ctx.font = `500 44px ${body}`;
    ctx.fillText(fit(ctx, l.exercise, left + textWidth - nameX), nameX, y);
  });
  if (rest > 0) {
    ctx.fillStyle = c.muted;
    ctx.font = `500 36px ${body}`;
    ctx.fillText(`+${rest} gerakan lagi`, left, top + shown.length * step);
  }

  ctx.shadowBlur = 0;
  const [front, back] = await figureImages(host);
  if (front) ctx.drawImage(front, 800, 110, 210, 400);
  if (back) ctx.drawImage(back, 800, 520, 210, 400);

  ctx.shadowBlur = 18;
  const logo = await loadImage(c.logo).catch(() => null);
  if (logo) {
    const h = 74;
    ctx.drawImage(logo, left, 935, (logo.width / logo.height) * h, h);
  }
  ctx.fillStyle = c.text;
  ctx.font = `600 42px ${body}`;
  ctx.textAlign = "right";
  ctx.fillText(fit(ctx, p.memberName, 420), SIZE - 70, 990);
  ctx.textAlign = "left";
}

/**
 * "Stiker latihan": the workout as a transparent 1080×1080 PNG (title,
 * "3x Gerakan" lines, front/back muscle map, OLYMPUS logo) to lay over a
 * photo in an Instagram/WhatsApp story.
 */
export function WorkoutStickerModal(props: WorkoutStickerModalProps) {
  const { title, levels, onClose } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState<Ink>("light");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !hostRef.current) return;
    drawSticker(canvasRef.current, hostRef.current, props, ink).catch(() => setError("Gagal menggambar stiker."));
    // props is a fresh object every render; redraw only when the look changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ink, title, levels]);

  async function save() {
    if (!canvasRef.current) return;
    setPending(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((r) => canvasRef.current!.toBlob(r, "image/png"));
      if (!blob) throw new Error("no blob");
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "latihan";
      await shareOrDownload(new File([blob], `olympus-stiker-${slug}.png`, { type: "image/png" }), "");
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setError("Gagal menyimpan gambar. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center" role="dialog" aria-modal="true" aria-label="Stiker latihan">
      <div className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-4 shadow-overlay sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-base font-bold uppercase tracking-wide">Stiker latihan</p>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-xl text-muted hover:text-foreground">
            ×
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">
          PNG dengan latar transparan. Tempel di atas foto story (Instagram: stiker → galeri), atau simpan dulu ke HP.
        </p>
        {/* Checkerboard behind the preview shows which parts are transparent. */}
        <div
          className={`overflow-hidden rounded-xl border border-border ${ink === "light" ? "bg-[#1f2937]" : "bg-[#f1f5f9]"}`}
          style={{
            backgroundImage:
              ink === "light"
                ? "conic-gradient(#374151 25%, transparent 0 50%, #374151 0 75%, transparent 0)"
                : "conic-gradient(#e2e8f0 25%, transparent 0 50%, #e2e8f0 0 75%, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        >
          <canvas ref={canvasRef} className="block h-auto w-full" aria-label={`Stiker ${title}`} />
        </div>
        <div className="mt-3 flex rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Warna teks">
          {(["light", "dark"] as Ink[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={ink === k}
              onClick={() => setInk(k)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${ink === k ? "bg-surface shadow-card" : "text-muted"}`}
            >
              {k === "light" ? "Teks putih" : "Teks gelap"}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted">Teks putih untuk foto gelap, teks gelap untuk foto terang.</p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="mt-3 h-12 rounded-xl bg-accent font-bold text-white hover:bg-accent-2 disabled:opacity-60"
        >
          {pending ? "Menyiapkan…" : "⬇️ Simpan / bagikan PNG"}
        </button>
      </div>
      {/* Source of the muscle figures drawn onto the canvas. */}
      <div ref={hostRef} aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
        <MuscleMap levels={levels} height={380} labels={false} tone={ink === "light" ? "light" : "dark"} />
      </div>
    </div>
  );
}
