"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MuscleMap } from "@/components/shared/MuscleMap";
import { drawSticker, figureImages, type WorkoutStickerModalProps } from "@/components/shared/WorkoutStickerModal";
import {
  CARD_H,
  CARD_W,
  drawListCard,
  drawMuscleCard,
  drawStatCard,
  drawSummaryCard,
  drawTotalCard,
  drawWeekCard,
  fillBackdrop,
  inkFor,
  type Backdrop,
  type ListCard,
  type MuscleCard,
  type StatCard,
  type SummaryCard,
  type TotalCard,
  type WeekCard,
} from "@/lib/shareCards";
import type { MuscleKey } from "@/lib/muscles";
import { shareOrDownload } from "@/lib/shareFile";

export type ShareCard =
  | { id: string; kind: "sticker"; sticker: Omit<WorkoutStickerModalProps, "onClose">; video?: undefined }
  | { id: string; kind: "stat"; stat: StatCard; /** An animated version exists (opens its own screen). */ video?: "volume" | "kalori" }
  | { id: string; kind: "summary"; summary: SummaryCard; video?: undefined }
  | { id: string; kind: "total"; total: TotalCard; video?: "volume" }
  | { id: string; kind: "list"; list: ListCard; video?: undefined }
  | { id: string; kind: "week"; week: WeekCard; video?: undefined }
  | { id: string; kind: "muscle"; muscle: MuscleCard; levels: Partial<Record<MuscleKey, number>>; video?: undefined };

/** Biru and Terang are solid; Bening is transparent with a see-through panel, for pasting on a photo. */
const BACKDROPS: { id: Backdrop; label: string; swatch: string }[] = [
  { id: "biru", label: "Biru", swatch: "radial-gradient(circle at 50% 10%, #2563eb, #0b1220 75%)" },
  { id: "bening", label: "Bening", swatch: "repeating-conic-gradient(#94a3b8 0 25%, #e2e8f0 0 50%) 0 0 / 10px 10px" },
  { id: "terang", label: "Terang", swatch: "radial-gradient(circle at 50% 10%, #bfdbfe, #f8fafc 75%)" },
];

const ICONS = {
  download: "M12 4v11m0 0l-4-4m4 4l4-4M5 19h14",
  text: "M5 6h14M5 11h14M5 16h9",
  video: "M4 6h11v12H4zM15 10l5-3v10l-5-3",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  photo: "M4 7h4l2-2h4l2 2h4v12H4zM12 10a3 3 0 100 6 3 3 0 000-6z",
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

/** A secondary button next to the main one. */
function Action({ icon, label, onClick, disabled, expanded }: { icon: keyof typeof ICONS; label: string; onClick: () => void; disabled?: boolean; expanded?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-border px-1 py-1.5 text-xs font-semibold disabled:opacity-50"
    >
      <Icon name={icon} />
      <span className="w-full truncate text-center">{label}</span>
    </button>
  );
}

/** A row in the "Lainnya" list. */
function MoreItem({ icon, label, onClick }: { icon: keyof typeof ICONS; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold active:bg-surface-2">
      <Icon name={icon} />
      {label}
    </button>
  );
}

/**
 * One share screen for a finished workout: swipe through the cards, then one
 * row of actions applies to the card in view (instead of a button and a
 * separate screen per card).
 */
export function ShareCards({
  cards,
  memberName,
  shareText,
  fileSlug,
  onVideo,
  onPhotoStory,
}: {
  cards: ShareCard[];
  memberName: string;
  shareText: string;
  fileSlug: string;
  onVideo: (kind: "volume" | "kalori") => void;
  /** Opens "Foto + stiker" (photos + the workout sticker). */
  onPhotoStory?: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [backdrop, setBackdrop] = useState<Backdrop>("biru");
  const [pending, setPending] = useState(false);
  // Video volume / kalori stay under "Lainnya" so the screen shows few buttons.
  const [moreOpen, setMoreOpen] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const ink = inkFor(backdrop);
  // The muscle figures drawn onto the sticker / Fokus otot card.
  const figureCard = cards.find((c) => c.kind === "sticker" || c.kind === "muscle");
  const figureLevels = figureCard?.kind === "sticker" ? figureCard.sticker.levels : figureCard?.kind === "muscle" ? figureCard.levels : null;
  const current = cards[Math.min(index, cards.length - 1)];

  // Draw every card: on a transparent layer first, then over the backdrop.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const [i, card] of cards.entries()) {
        const target = canvases.current[i];
        if (!target) continue;
        const layer = document.createElement("canvas");
        try {
          if (card.kind === "sticker") {
            if (!hostRef.current) continue;
            await drawSticker(layer, hostRef.current, card.sticker, ink);
          } else if (card.kind === "muscle") {
            if (!hostRef.current) continue;
            await drawMuscleCard(layer, await figureImages(hostRef.current), card.muscle, ink, memberName);
          } else if (card.kind === "summary") await drawSummaryCard(layer, card.summary, ink, memberName);
          else if (card.kind === "total") await drawTotalCard(layer, card.total, ink, memberName);
          else if (card.kind === "list") await drawListCard(layer, card.list, ink, memberName);
          else if (card.kind === "week") await drawWeekCard(layer, card.week, ink, memberName);
          else await drawStatCard(layer, card.stat, ink, memberName);
        } catch {
          continue;
        }
        if (cancelled) return;
        target.width = CARD_W;
        target.height = CARD_H;
        const ctx = target.getContext("2d")!;
        fillBackdrop(ctx, backdrop);
        // The sticker is square: centred on the portrait card.
        ctx.drawImage(layer, 0, (CARD_H - layer.height) / 2);
      }
    })();
    return () => {
      cancelled = true;
    };
    // cards is rebuilt each render; its content only changes with these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backdrop, ink, memberName, cards.map((c) => JSON.stringify(c.kind === "sticker" ? c.id + c.sticker.title : c)).join("|")]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    // The card nearest the middle of the screen is the one being shared
    // (dividing the scroll by a card's width drifted onto the previous one).
    const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    [...el.children].forEach((child, i) => {
      const r = child.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setIndex(Math.min(cards.length - 1, best));
  }, [cards.length]);

  const toBlob = () =>
    new Promise<Blob>((resolve, reject) => {
      const c = canvases.current[index];
      if (!c) return reject(new Error("no canvas"));
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png");
    });
  const fileName = () => `olympus-${fileSlug}-${current.id}.png`;

  async function run(fn: () => Promise<void>, fail: string) {
    setPending(true);
    setNote(null);
    try {
      await fn();
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setNote({ tone: "error", text: fail });
    } finally {
      setPending(false);
    }
  }

  const share = () =>
    run(async () => {
      await shareOrDownload(new File([await toBlob()], fileName(), { type: "image/png" }), shareText);
    }, "Gagal membagikan. Coba Unduh.");

  const download = () =>
    run(async () => {
      const file = new File([await toBlob()], fileName(), { type: "image/png" });
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        // iPhone only puts images in Photos through the share sheet ("Simpan Gambar").
        await shareOrDownload(file, "");
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setNote({ tone: "ok", text: "Gambar tersimpan." });
    }, "Gagal menyimpan gambar. Coba lagi.");

  // Copy → paste in the Instagram story editor keeps the transparency. The
  // ClipboardItem gets a promise so the write still counts as part of this
  // tap on Safari.
  async function copyImage() {
    setNote(null);
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setNote({ tone: "error", text: "HP ini belum bisa menyalin gambar. Pakai Unduh." });
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": toBlob() })]);
      setNote({ tone: "ok", text: "Stiker tersalin. Di Instagram: buka Story, ketuk Aa, tahan di kolom teks, lalu Tempel." });
    } catch {
      setNote({ tone: "error", text: "Gagal menyalin. Pakai Unduh." });
    }
  }

  // "Teks": the phone's share menu with just the text (WhatsApp, Line, …);
  // where there is no share menu, the text is copied instead.
  async function shareTextOnly() {
    setNote(null);
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setNote({ tone: "ok", text: "Teks tersalin. Tempel di WhatsApp atau caption." });
    } catch {
      setNote({ tone: "error", text: "Gagal menyalin teks." });
    }
  }

  // Formats that open their own screen (Lainnya).
  const videos = [...new Set(cards.flatMap((c) => (c.video ? [c.video] : [])))];

  return (
    <div className="flex flex-col gap-3">
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[18%]" aria-label="Kartu untuk dibagikan">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className="w-full shrink-0 snap-center overflow-hidden rounded-2xl border border-border"
            // Checkerboard shows which parts are transparent.
            style={backdrop === "bening" ? { background: "repeating-conic-gradient(#cbd5e1 0 25%, #f1f5f9 0 50%) 0 0 / 24px 24px" } : undefined}
          >
            <canvas
              ref={(el) => {
                canvases.current[i] = el;
              }}
              width={CARD_W}
              height={CARD_H}
              className="block aspect-[3/4] h-auto w-full"
              aria-label={`Kartu ${i + 1} dari ${cards.length}`}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5" aria-hidden>
        {cards.map((c, i) => (
          <span key={c.id} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-accent" : "w-1.5 bg-border-strong"}`} />
        ))}
      </div>

      {/* Only on cards with an animated version (Total angkatan, Kalori). */}
      {current.video && (
        <button type="button" onClick={() => onVideo(current.video!)} className="-mt-1 inline-flex min-h-10 items-center gap-1.5 self-center px-2 text-sm font-semibold text-accent hover:underline">
          <Icon name="video" />
          Versi video
        </button>
      )}

      <div role="radiogroup" aria-label="Warna kartu" className="flex justify-center gap-2">
        {BACKDROPS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={backdrop === b.id}
            onClick={() => setBackdrop(b.id)}
            className={`flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold ${backdrop === b.id ? "border-accent bg-accent/10" : "border-border"}`}
          >
            <span aria-hidden className="h-5 w-5 rounded-full border border-border" style={{ background: b.swatch }} />
            {b.label}
          </button>
        ))}
      </div>

      {/* Bening is for pasting on a photo, so it copies; the solid colours share. */}
      {backdrop === "bening" ? (
        <button type="button" onClick={copyImage} disabled={pending} className="h-12 rounded-xl bg-accent font-bold text-white disabled:opacity-60">
          Salin stiker untuk Story
        </button>
      ) : (
        <button type="button" onClick={share} disabled={pending} className="h-12 rounded-xl bg-accent font-bold text-white disabled:opacity-60">
          {pending ? "Menyiapkan…" : "Bagikan ke Story"}
        </button>
      )}

      <div className="flex gap-2">
        {onPhotoStory && <Action icon="photo" label="Foto + stiker" onClick={onPhotoStory} />}
        {videos.length > 0 && <Action icon="more" label="Lainnya" onClick={() => setMoreOpen((o) => !o)} expanded={moreOpen} />}
        <Action icon="text" label="Teks" onClick={shareTextOnly} />
        <Action icon="download" label="Simpan" onClick={download} disabled={pending} />
      </div>
      {moreOpen && videos.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {videos.includes("volume") && <MoreItem icon="video" label="Video volume" onClick={() => { setMoreOpen(false); onVideo("volume"); }} />}
          {videos.includes("kalori") && <MoreItem icon="video" label="Video kalori" onClick={() => { setMoreOpen(false); onVideo("kalori"); }} />}
        </div>
      )}

      {note && (
        <p role="status" className={`rounded-xl px-3 py-2 text-center text-[13px] ${note.tone === "ok" ? "bg-surface-2" : "bg-danger/10 text-danger"}`}>
          {note.text}
        </p>
      )}
      {backdrop === "bening" && (
        <p className="text-center text-xs text-muted">Bening untuk ditempel di atas foto Story: salin, lalu tempel di Instagram. Kalau dibagikan langsung, latarnya jadi hitam.</p>
      )}

      {/* Source of the muscle figures drawn onto the sticker card. */}
      {figureLevels && (
        <div ref={hostRef} aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
          <MuscleMap levels={figureLevels} height={380} labels={false} tone={ink} />
        </div>
      )}
    </div>
  );
}
