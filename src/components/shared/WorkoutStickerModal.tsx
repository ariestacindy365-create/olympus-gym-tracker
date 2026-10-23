"use client";

import { useEffect, useRef, useState } from "react";
import { MuscleMap } from "@/components/shared/MuscleMap";
import { shareOrDownload } from "@/lib/shareFile";
import { formatKg } from "@/lib/volumeStory";
import type { MuscleKey } from "@/lib/muscles";

interface StickerLine {
  exercise: string;
  sets: number;
}

interface WorkoutStickerModalProps {
  title: string;
  lines: StickerLine[];
  levels: Partial<Record<MuscleKey, number>>;
  totalVolume: number;
  totalSets: number;
  prCount: number;
  memberName: string;
  onClose: () => void;
}

const SIZE = 1080;
type Ink = "light" | "dark";
const INK = {
  light: { text: "#ffffff", muted: "rgba(255,255,255,0.72)", accent: "#3b82f6", shadow: "rgba(0,0,0,0.45)", logo: "/olympus-logo-light-bw.png" },
  dark: { text: "#0b1220", muted: "rgba(11,18,32,0.65)", accent: "#2563eb", shadow: "rgba(255,255,255,0.5)", logo: "/olympus-logo-bw.png" },
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

  // Poster layout: the title runs up the left edge, front/back figures fill
  // the right, total volume sits under a rule at the bottom.
  const margin = 70;
  const title = p.title.toUpperCase();
  let size = 170;
  ctx.font = `700 ${size}px ${display}`;
  while (size > 90 && ctx.measureText(title).width > SIZE - 2 * margin) {
    size -= 4;
    ctx.font = `700 ${size}px ${display}`;
  }
  ctx.fillStyle = c.text;
  ctx.save();
  ctx.translate(margin + size * 0.76, SIZE - margin);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(fit(ctx, title, SIZE - 2 * margin), 0, 0);
  ctx.restore();

  const col = 270;
  const right = SIZE - margin;
  ctx.shadowBlur = 0;
  const [front, back] = await figureImages(host);
  const figH = 660;
  const figW = Math.round(figH * (200 / 380));
  const gap = right - col - 2 * figW;
  if (front) ctx.drawImage(front, col, 70, figW, figH);
  if (back) ctx.drawImage(back, col + figW + gap, 70, figW, figH);

  ctx.shadowBlur = 18;
  ctx.fillRect(col, 790, right - col, 5);

  ctx.font = `700 150px ${display}`;
  const volume = formatKg(p.totalVolume);
  ctx.fillText(fit(ctx, volume, 470), col, 950);
  const volW = Math.min(470, ctx.measureText(volume).width);
  ctx.font = `700 54px ${display}`;
  ctx.fillText("KG", col + volW + 14, 950);

  ctx.fillStyle = c.muted;
  ctx.font = `600 32px ${body}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
  const stats = [`${p.totalSets} SET`, p.prCount ? `${p.prCount} PR` : ""].filter(Boolean).join(" · ");
  ctx.fillText(fit(ctx, stats, 400), col, SIZE - margin);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  const logo = await loadImage(c.logo).catch(() => null);
  if (logo) {
    const h = 62;
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, right - w, 840, w, h);
  }
  ctx.fillStyle = c.text;
  ctx.font = `600 38px ${body}`;
  ctx.textAlign = "right";
  ctx.fillText(fit(ctx, p.memberName, 300), right, SIZE - margin);
  ctx.textAlign = "left";
}

/**
 * "Stiker latihan": the workout as a transparent 1080×1080 PNG (title up the
 * side, front/back muscle map, total volume, OLYMPUS logo) to lay over a
 * photo in an Instagram/WhatsApp story.
 */
export function WorkoutStickerModal(props: WorkoutStickerModalProps) {
  const { title, levels, onClose } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState<Ink>("light");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !hostRef.current) return;
    drawSticker(canvasRef.current, hostRef.current, props, ink).catch(() => setError("Gagal menggambar stiker."));
    // props is a fresh object every render; redraw only when the look changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ink, title, levels, props.totalVolume]);

  const toPngBlob = () =>
    new Promise<Blob>((resolve, reject) =>
      canvasRef.current ? canvasRef.current.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png") : reject(new Error("no canvas"))
    );

  // Copy → paste in the Instagram story editor keeps the transparency
  // (sharing the file straight to Instagram/WhatsApp turns it into a JPG
  // with a black background). The ClipboardItem gets a promise so the
  // write still counts as part of this tap on Safari.
  async function copy() {
    setError(null);
    setSaved(false);
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setError("HP ini belum bisa menyalin gambar. Pakai Simpan PNG.");
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": toPngBlob() })]);
      setCopied(true);
    } catch {
      setError("Gagal menyalin. Pakai Simpan PNG.");
    }
  }

  async function save() {
    setPending(true);
    setError(null);
    setCopied(false);
    try {
      const blob = await toPngBlob();
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "latihan";
      const file = new File([blob], `olympus-stiker-${slug}.png`, { type: "image/png" });
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        // iPhone only puts images in Photos through the share sheet ("Simpan Gambar").
        await shareOrDownload(file, "");
      } else {
        // Elsewhere download the PNG itself: the share sheet would hand it to
        // apps that recompress it to JPG and lose the transparency.
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setSaved(true);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setError("Gagal menyimpan gambar. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center" role="dialog" aria-modal="true" aria-label="Stiker latihan">
      <div className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-4 [&>*]:shrink-0 shadow-overlay sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-base font-bold uppercase tracking-wide">Stiker latihan</p>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-xl text-muted hover:text-foreground">
            ×
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">
          PNG dengan latar transparan, untuk ditempel di atas foto story kamu.
        </p>
        {/* Checkerboard behind the preview shows which parts are transparent. */}
        <div
          className={`shrink-0 overflow-hidden rounded-xl border border-border ${ink === "light" ? "bg-[#1f2937]" : "bg-[#f1f5f9]"}`}
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
        <button type="button" onClick={copy} className="mt-3 h-12 rounded-xl bg-accent font-bold text-white hover:bg-accent-2">
          {copied ? "✓ Stiker tersalin" : "📋 Salin stiker"}
        </button>
        {copied && (
          <ol className="mt-2 list-decimal rounded-xl bg-surface-2 py-2.5 pl-8 pr-3 text-[13px] leading-relaxed">
            <li>Buka Instagram → buat Story → pilih foto latarnya.</li>
            <li>Ketuk <b>Aa</b> (teks), tahan di kolom teks, lalu pilih <b>Tempel</b>.</li>
            <li>Stiker muncul transparan. Geser dan cubit untuk mengatur ukurannya.</li>
          </ol>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="mt-2 h-11 rounded-xl border border-border bg-surface text-sm font-semibold hover:bg-surface-2 disabled:opacity-60"
        >
          {pending ? "Menyiapkan…" : "⬇️ Simpan PNG"}
        </button>
        {saved && (
          <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-[12.5px] leading-relaxed">
            Tersimpan sebagai PNG. Di Instagram Story pakai <b>stiker → foto galeri</b> untuk menempelkannya.
            {/iphone|ipad|ipod/i.test(navigator.userAgent) ? " Di menu bagikan pilih Simpan Gambar." : ""}
          </p>
        )}
        <p className="mt-2 text-center text-[11px] text-muted">
          Jangan kirim stiker lewat WhatsApp atau tombol bagikan Instagram: aplikasinya mengubah gambar jadi JPG dan latarnya jadi hitam.
        </p>
      </div>
      {/* Source of the muscle figures drawn onto the canvas. */}
      <div ref={hostRef} aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
        <MuscleMap levels={levels} height={380} labels={false} tone={ink === "light" ? "light" : "dark"} />
      </div>
    </div>
  );
}
