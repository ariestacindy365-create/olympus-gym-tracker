"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MuscleMap } from "@/components/shared/MuscleMap";
import { drawSticker, figureImages, type WorkoutStickerModalProps } from "@/components/shared/WorkoutStickerModal";
import {
  CARD_SIZE,
  drawListCard,
  drawMuscleCard,
  drawStatCard,
  drawWeekCard,
  fillOlympusBackground,
  type ListCard,
  type MuscleCard,
  type StatCard,
  type WeekCard,
} from "@/lib/shareCards";
import type { MuscleKey } from "@/lib/muscles";
import { shareOrDownload } from "@/lib/shareFile";

export type ShareCard =
  | { id: string; kind: "sticker"; sticker: Omit<WorkoutStickerModalProps, "onClose">; video?: undefined }
  | { id: string; kind: "stat"; stat: StatCard; /** An animated version exists (opens its own screen). */ video?: "volume" | "kalori" }
  | { id: string; kind: "list"; list: ListCard; video?: undefined }
  | { id: string; kind: "week"; week: WeekCard; video?: undefined }
  | { id: string; kind: "muscle"; muscle: MuscleCard; levels: Partial<Record<MuscleKey, number>>; video?: undefined };

/** Olympus background, or transparent with white / dark text for pasting on a photo. */
type Backdrop = "solid" | "light" | "dark";
const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: "solid", label: "Biru" },
  { id: "light", label: "Transparan" },
  { id: "dark", label: "Teks gelap" },
];

const ICONS = {
  backdrop: "M4 4h16v16H4zM4 12h16M12 4v16",
  share: "M12 15V4m0 0l-4 4m4-4l4 4M5 13v6h14v-6",
  copy: "M9 9h10v10H9zM5 15V5h10",
  download: "M12 4v11m0 0l-4-4m4 4l4-4M5 19h14",
  text: "M5 6h14M5 11h14M5 16h9",
  video: "M4 6h11v12H4zM15 10l5-3v10l-5-3",
};

function Action({ icon, label, onClick, disabled, primary }: { icon: keyof typeof ICONS; label: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex min-w-0 max-w-[4.75rem] flex-1 basis-0 flex-col items-center gap-1.5 text-[11px] font-semibold text-muted disabled:opacity-50">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${primary ? "bg-accent text-white" : "bg-surface-2 text-foreground"}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={ICONS[icon]} />
        </svg>
      </span>
      <span className="w-full break-words text-center leading-tight">{label}</span>
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
}: {
  cards: ShareCard[];
  memberName: string;
  shareText: string;
  fileSlug: string;
  onVideo: (kind: "volume" | "kalori") => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [backdrop, setBackdrop] = useState<Backdrop>("solid");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const ink = backdrop === "dark" ? "dark" : "light";
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
          } else if (card.kind === "list") await drawListCard(layer, card.list, ink, memberName);
          else if (card.kind === "week") await drawWeekCard(layer, card.week, ink, memberName);
          else await drawStatCard(layer, card.stat, ink, memberName);
        } catch {
          continue;
        }
        if (cancelled) return;
        target.width = CARD_SIZE;
        target.height = CARD_SIZE;
        const ctx = target.getContext("2d")!;
        ctx.clearRect(0, 0, CARD_SIZE, CARD_SIZE);
        if (backdrop === "solid") fillOlympusBackground(ctx);
        ctx.drawImage(layer, 0, 0);
      }
    })();
    return () => {
      cancelled = true;
    };
    // cards is rebuilt each render; its content only changes with these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backdrop, ink, memberName, cards.map((c) => c.id + JSON.stringify(c.kind === "sticker" ? c.sticker.title : c.kind === "stat" ? c.stat : c.kind === "list" ? c.list : c.kind === "week" ? c.week : c.muscle)).join("|")]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 12 : el.clientWidth;
    setIndex(Math.max(0, Math.min(cards.length - 1, Math.round(el.scrollLeft / step))));
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
      setNote({ tone: "ok", text: "Gambar tersalin. Di Instagram Story: ketuk Aa, tahan di kolom teks, lalu Tempel." });
    } catch {
      setNote({ tone: "error", text: "Gagal menyalin. Pakai Unduh." });
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setNote({ tone: "ok", text: "Teks tersalin." });
    } catch {
      setNote({ tone: "error", text: "Gagal menyalin teks." });
    }
  }

  const nextBackdrop = () => setBackdrop((b) => BACKDROPS[(BACKDROPS.findIndex((x) => x.id === b) + 1) % BACKDROPS.length].id);

  return (
    <div className="flex flex-col gap-3">
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[11%]" aria-label="Kartu untuk dibagikan">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className={`w-full shrink-0 snap-center overflow-hidden rounded-2xl border border-border ${backdrop === "dark" ? "bg-[#f1f5f9]" : "bg-[#1f2937]"}`}
            // Checkerboard shows which parts are transparent.
            style={
              backdrop === "solid"
                ? undefined
                : {
                    backgroundImage:
                      backdrop === "light"
                        ? "conic-gradient(#374151 25%, transparent 0 50%, #374151 0 75%, transparent 0)"
                        : "conic-gradient(#e2e8f0 25%, transparent 0 50%, #e2e8f0 0 75%, transparent 0)",
                    backgroundSize: "24px 24px",
                  }
            }
          >
            <canvas
              ref={(el) => {
                canvases.current[i] = el;
              }}
              width={CARD_SIZE}
              height={CARD_SIZE}
              className="block aspect-square h-auto w-full"
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

      {/* Up to six actions, all on screen at once. */}
      <div className="flex justify-center gap-0.5">
        <Action icon="share" label="Bagikan" onClick={share} disabled={pending} primary />
        <Action icon="backdrop" label={`Latar ${BACKDROPS.find((b) => b.id === backdrop)!.label}`} onClick={nextBackdrop} />
        <Action icon="copy" label="Salin gambar" onClick={copyImage} disabled={pending} />
        <Action icon="download" label="Unduh" onClick={download} disabled={pending} />
        <Action icon="text" label="Salin teks" onClick={copyText} />
        {current.video && <Action icon="video" label="Versi video" onClick={() => onVideo(current.video!)} />}
      </div>

      {note && (
        <p role="status" className={`rounded-xl px-3 py-2 text-center text-[13px] ${note.tone === "ok" ? "bg-surface-2" : "bg-danger/10 text-danger"}`}>
          {note.text}
        </p>
      )}
      {backdrop !== "solid" && (
        <p className="text-center text-xs text-muted">Latar transparan: pakai Salin gambar atau Unduh. Bagikan langsung ke Instagram/WhatsApp membuat latarnya hitam.</p>
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
