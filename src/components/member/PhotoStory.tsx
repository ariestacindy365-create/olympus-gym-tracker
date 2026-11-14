"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MuscleMap } from "@/components/shared/MuscleMap";
import { drawSticker, figureImages, type WorkoutStickerModalProps } from "@/components/shared/WorkoutStickerModal";
import { drawStatCard, type StatCard } from "@/lib/shareCards";
import { shareOrDownload } from "@/lib/shareFile";
import {
  START,
  STICKER_POSITIONS,
  STORY_H,
  STORY_W,
  clampPlacement,
  clampSticker,
  imageRect,
  inBox,
  layoutBoxes,
  stickerRect,
  type Layout,
  type Placement,
  type StickerPlace,
} from "@/lib/photoStory";

type Content = "stiker" | "ringkas" | "badan";
type Look = "kotak" | "bening" | "gelap";

const CONTENTS: { id: Content; label: string }[] = [
  { id: "stiker", label: "Stiker latihan" },
  { id: "ringkas", label: "Ringkas" },
  { id: "badan", label: "Badan saja" },
];
const LOOKS: { id: Look; label: string }[] = [
  { id: "kotak", label: "Kotak gelap" },
  { id: "bening", label: "Bening" },
  { id: "gelap", label: "Teks gelap" },
];
const LAYOUTS: Layout[] = [1, 2, 3, 4];

interface Photo {
  img: HTMLImageElement;
  url: string;
  place: Placement;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** The drawn part of a transparent layer, so the sticker box hugs its content. */
function trim(layer: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = layer;
  const data = layer.getContext("2d")!.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return layer;
  const pad = 36;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w, x1 + pad);
  y1 = Math.min(h, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0;
  out.height = y1 - y0;
  out.getContext("2d")!.drawImage(layer, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * "Story foto": 1–4 photos from the gallery in an automatic collage, each
 * one moved with a finger and zoomed with two, and today's workout sticker
 * on top. Saved as a 1080×1920 JPEG for an Instagram Story.
 */
export function PhotoStory({
  sticker,
  summary,
  memberName,
  shareText,
  fileSlug,
  onClose,
}: {
  sticker: Omit<WorkoutStickerModalProps, "onClose">;
  summary: StatCard;
  memberName: string;
  shareText: string;
  fileSlug: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>(1);
  const [photos, setPhotos] = useState<(Photo | null)[]>([null, null, null, null]);
  const [selected, setSelected] = useState<number | null>(null);
  const [content, setContent] = useState<Content>("stiker");
  const [look, setLook] = useState<Look>("kotak");
  const [layer, setLayer] = useState<HTMLCanvasElement | null>(null);
  const [place, setPlace] = useState<StickerPlace>({ cx: 0.5, cy: 0.8, w: 0.8 });
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Which slot the file picker fills (null: a fresh pick of 1–4 photos).
  const pickFor = useRef<number | null>(null);
  const ink = look === "gelap" ? "dark" : "light";
  const boxes = layoutBoxes(layout);
  const aspect = layer ? layer.width / layer.height : 1;

  // Free the photo URLs when the screen closes.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => p && URL.revokeObjectURL(p.url)), []);

  // Draw the chosen sticker on a transparent layer, then trim it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise((r) => requestAnimationFrame(r));
      const c = document.createElement("canvas");
      try {
        if (content === "stiker") {
          if (!hostRef.current) return;
          await drawSticker(c, hostRef.current, sticker, ink);
        } else if (content === "ringkas") {
          await drawStatCard(c, summary, ink, memberName);
        } else {
          if (!hostRef.current) return;
          const figs = await figureImages(hostRef.current);
          c.width = 820;
          c.height = 780;
          const ctx = c.getContext("2d")!;
          figs.forEach((f, i) => f && ctx.drawImage(f, 10 + i * 410, 0, 400, 760));
        }
      } catch {
        return;
      }
      if (!cancelled) setLayer(trim(c));
    })();
    return () => {
      cancelled = true;
    };
    // sticker / summary are rebuilt each render; their content doesn't change on this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, ink]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, forExport: boolean) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, STORY_W, STORY_H);
      boxes.forEach((b, i) => {
        const p = photos[i];
        ctx.save();
        ctx.beginPath();
        ctx.rect(b.x, b.y, b.w, b.h);
        ctx.clip();
        if (p) {
          const r = imageRect(p.img, b, p.place);
          ctx.drawImage(p.img, r.x, r.y, r.w, r.h);
        } else if (!forExport) {
          ctx.fillStyle = "#1f2937";
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = "#94a3b8";
          ctx.font = "600 64px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`+ Foto ${i + 1}`, b.x + b.w / 2, b.y + b.h / 2);
        }
        ctx.restore();
        if (!forExport && selected === i && p) {
          ctx.strokeStyle = "#60a5fa";
          ctx.lineWidth = 12;
          ctx.strokeRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
        }
      });
      if (layer) {
        const r = stickerRect(place, aspect);
        if (look === "kotak") {
          ctx.fillStyle = "rgba(11, 18, 32, 0.72)";
          roundRect(ctx, r.x, r.y, r.w, r.h, 36);
          ctx.fill();
        }
        if (look === "bening") {
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.55)";
          ctx.shadowBlur = 24;
          ctx.drawImage(layer, r.x, r.y, r.w, r.h);
          ctx.restore();
        } else ctx.drawImage(layer, r.x, r.y, r.w, r.h);
      }
    },
    [boxes, photos, selected, layer, place, aspect, look]
  );

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    draw(c.getContext("2d")!, false);
  }, [draw]);

  // --- Gestures -----------------------------------------------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    target: "sticker" | number;
    startPlace: Placement | StickerPlace;
    startMid: { x: number; y: number };
    startDist: number;
    moved: boolean;
    downAt: number;
  } | null>(null);

  const toStory = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * STORY_W, y: ((e.clientY - r.top) / r.height) * STORY_H };
  };
  const mid = () => {
    const ps = [...pointers.current.values()];
    return { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length };
  };
  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  function startGesture() {
    const m = mid();
    const g = gesture.current;
    if (!g) return;
    g.startMid = m;
    g.startDist = dist();
    g.startPlace = g.target === "sticker" ? place : (photos[g.target]?.place ?? START);
  }

  function onPointerDown(e: React.PointerEvent) {
    // A new first finger: drop any touch left over from one that never lifted.
    if (e.isPrimary) pointers.current.clear();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const pt = toStory(e);
    pointers.current.set(e.pointerId, pt);
    if (pointers.current.size === 1) {
      const onSticker = layer && inBox(stickerRect(place, aspect), pt.x, pt.y);
      const slot = boxes.findIndex((b) => inBox(b, pt.x, pt.y));
      gesture.current = {
        target: onSticker ? "sticker" : slot,
        startPlace: START,
        startMid: pt,
        startDist: 0,
        moved: false,
        downAt: Date.now(),
      };
    }
    startGesture();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, toStory(e));
    const g = gesture.current;
    const m = mid();
    const dx = m.x - g.startMid.x;
    const dy = m.y - g.startMid.y;
    if (Math.hypot(dx, dy) > 18) g.moved = true;
    const ratio = g.startDist > 0 && pointers.current.size > 1 ? dist() / g.startDist : 1;
    if (ratio !== 1) g.moved = true;
    if (!g.moved) return;
    if (g.target === "sticker") {
      const s = g.startPlace as StickerPlace;
      setPlace(clampSticker({ cx: s.cx + dx / STORY_W, cy: s.cy + dy / STORY_H, w: s.w * ratio }, aspect));
    } else if (g.target >= 0) {
      const i = g.target;
      const s = g.startPlace as Placement;
      setPhotos((prev) => {
        const p = prev[i];
        if (!p) return prev;
        const next = [...prev];
        next[i] = { ...p, place: clampPlacement(p.img, boxes[i], { zoom: s.zoom * ratio, dx: s.dx + dx, dy: s.dy + dy }) };
        return next;
      });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) {
      startGesture();
      return;
    }
    gesture.current = null;
    // A tap: pick a photo for an empty box, or select a photo.
    if (g && !g.moved && Date.now() - g.downAt < 500 && typeof g.target === "number" && g.target >= 0) {
      if (!photos[g.target]) choose(g.target);
      else setSelected((s) => (s === g.target ? null : (g.target as number)));
    }
  }

  // --- Photos -------------------------------------------------------------
  function choose(slot: number | null) {
    pickFor.current = slot;
    const input = fileRef.current;
    if (!input) return;
    input.multiple = slot === null;
    input.value = "";
    input.click();
  }

  async function onFiles(files: FileList | null) {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/")).slice(0, 4);
    if (!list.length) return;
    let loaded: Photo[];
    try {
      loaded = await Promise.all(
        list.map(async (f) => {
          const url = URL.createObjectURL(f);
          return { img: await loadImage(url), url, place: START };
        })
      );
    } catch {
      setNote({ tone: "error", text: "Foto tidak bisa dibuka. Coba foto lain." });
      return;
    }
    setNote(null);
    const slot = pickFor.current;
    setPhotos((prev) => {
      const next = [...prev];
      if (slot === null) {
        prev.forEach((p) => p && URL.revokeObjectURL(p.url));
        for (let i = 0; i < 4; i++) next[i] = loaded[i] ?? null;
      } else {
        if (prev[slot]) URL.revokeObjectURL(prev[slot]!.url);
        next[slot] = loaded[0];
      }
      return next;
    });
    if (slot === null) {
      // The collage follows how many photos were picked.
      setLayout(loaded.length as Layout);
      setSelected(null);
    } else setSelected(slot);
  }

  function changeLayout(l: Layout) {
    setLayout(l);
    setSelected(null);
    // A new shape: every photo starts centred again.
    setPhotos((prev) => prev.map((p) => (p ? { ...p, place: START } : p)));
  }

  function setZoom(i: number, zoom: number) {
    setPhotos((prev) => {
      const p = prev[i];
      if (!p) return prev;
      const next = [...prev];
      next[i] = { ...p, place: clampPlacement(p.img, boxes[i], { ...p.place, zoom }) };
      return next;
    });
  }

  // --- Output -------------------------------------------------------------
  const missing = boxes.filter((_, i) => !photos[i]).length;

  async function toFile() {
    const c = document.createElement("canvas");
    c.width = STORY_W;
    c.height = STORY_H;
    draw(c.getContext("2d")!, true);
    const blob = await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/jpeg", 0.9));
    return new File([blob], `olympus-${fileSlug}-story.jpg`, { type: "image/jpeg" });
  }

  async function run(save: boolean) {
    if (missing > 0) {
      setNote({ tone: "error", text: `Pilih ${missing} foto lagi dulu.` });
      return;
    }
    setPending(true);
    setNote(null);
    try {
      const file = await toFile();
      if (!save || /iphone|ipad|ipod/i.test(navigator.userAgent)) {
        // iPhone puts images in Photos only through the share sheet.
        await shareOrDownload(file, save ? "" : shareText);
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      if (save) setNote({ tone: "ok", text: "Story tersimpan." });
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setNote({ tone: "error", text: "Gagal membuat Story. Coba lagi." });
    } finally {
      setPending(false);
    }
  }

  const chip = (on: boolean) =>
    `min-h-10 shrink-0 rounded-full border px-3 text-sm font-semibold ${on ? "border-accent bg-accent text-white" : "border-border bg-surface text-foreground"}`;
  const sel = selected !== null ? photos[selected] : null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Story foto" className="fixed inset-0 z-[70] flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <button type="button" onClick={onClose} className="min-h-11 text-sm font-semibold text-muted">
          ← Kembali
        </button>
        <p className="font-display text-lg font-bold">Story foto</p>
        <button type="button" onClick={() => choose(null)} className="min-h-11 text-sm font-semibold text-accent">
          Pilih foto
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-4 py-3">
        <canvas
          ref={canvasRef}
          width={STORY_W}
          height={STORY_H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="block h-auto w-full max-w-[min(100%,calc((100dvh-20rem)*9/16))] shrink-0 touch-none select-none rounded-xl shadow-raised"
          aria-label="Pratinjau Story. Geser foto dengan satu jari, cubit untuk zoom, ketuk untuk memilih."
        />
        <p className="text-center text-xs text-muted">Geser foto dengan satu jari, cubit dua jari untuk zoom. Stiker juga bisa digeser dan dicubit.</p>

        {sel && selected !== null && (
          <div className="flex w-full max-w-md flex-col gap-2 rounded-xl bg-surface-2 p-3">
            <label className="flex items-center gap-3 text-sm font-semibold">
              Zoom
              <input type="range" min={1} max={4} step={0.01} value={sel.place.zoom} onChange={(e) => setZoom(selected, Number(e.target.value))} className="flex-1 accent-[var(--color-accent)]" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPhotos((prev) => prev.map((p, i) => (i === selected && p ? { ...p, place: START } : p)))} className={chip(false)}>
                Reset
              </button>
              <button type="button" onClick={() => choose(selected)} className={chip(false)}>
                Ganti foto
              </button>
            </div>
          </div>
        )}

        <div className="flex w-full max-w-md flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Bentuk</p>
          <div className="flex gap-2">
            {LAYOUTS.map((l) => (
              <button key={l} type="button" onClick={() => changeLayout(l)} aria-pressed={layout === l} className={chip(layout === l)}>
                {l} foto
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">Stiker</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {CONTENTS.map((c) => (
              <button key={c.id} type="button" onClick={() => {
                  setContent(c.id);
                  // "Teks gelap" only exists for the workout sticker.
                  if (c.id !== "stiker" && look === "gelap") setLook("kotak");
                }} aria-pressed={content === c.id} className={chip(content === c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {LOOKS.filter((l) => l.id !== "gelap" || content === "stiker").map((l) => (
              <button key={l.id} type="button" onClick={() => setLook(l.id)} aria-pressed={look === l.id} className={chip(look === l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {(Object.entries(STICKER_POSITIONS) as [keyof typeof STICKER_POSITIONS, number][]).map(([label, cy]) => (
              <button key={label} type="button" onClick={() => setPlace((p) => clampSticker({ ...p, cx: 0.5, cy }, aspect))} className={chip(false)}>
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold">
            Ukuran
            <input type="range" min={0.35} max={1} step={0.01} value={place.w} onChange={(e) => setPlace((p) => clampSticker({ ...p, w: Number(e.target.value) }, aspect))} className="flex-1 accent-[var(--color-accent)]" />
          </label>
        </div>

        {note && (
          <p role="status" className={`w-full max-w-md rounded-xl px-3 py-2 text-center text-[13px] ${note.tone === "ok" ? "bg-surface-2" : "bg-danger/10 text-danger"}`}>
            {note.text}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-t border-border px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <button type="button" onClick={() => run(true)} disabled={pending} className="h-12 flex-1 rounded-xl border border-border font-bold disabled:opacity-60">
          Simpan
        </button>
        <button type="button" onClick={() => run(false)} disabled={pending} className="h-12 flex-[2] rounded-xl bg-accent font-bold text-white disabled:opacity-60">
          {pending ? "Menyiapkan…" : "Bagikan ke Story"}
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} aria-label="Pilih foto" />
      {/* Source of the muscle figures drawn onto the sticker. */}
      <div ref={hostRef} aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
        <MuscleMap levels={sticker.levels} height={380} labels={false} tone={ink} />
      </div>
    </div>
  );
}
