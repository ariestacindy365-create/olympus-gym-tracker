"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { shareOrDownload } from "@/lib/shareFile";
import { STORY_HEIGHT, STORY_WIDTH, loadStoryAssets } from "@/lib/volumeStory";
import { drawProgressCard, progressCaption, type ProgressStoryData } from "@/lib/progressStory";

interface ProgressStoryModalProps {
  data: ProgressStoryData;
  onClose: () => void;
}

/** Share popup for the "Progres Saya" image card (estimated-1RM trend). */
export function ProgressStoryModal({ data, onClose }: ProgressStoryModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStoryAssets().then((assets) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (cancelled || !ctx) return;
      drawProgressCard(ctx, assets, data);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    setPending(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Gagal membuat gambar.");
      const file = new File([blob], `olympus-progres-${Date.now()}.png`, { type: "image/png" });
      await shareOrDownload(file, progressCaption(data));
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setError("Gagal menyiapkan gambar. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-md">
      {/* Like the other share cards: no tap-outside close, only ✕ / "Nanti saja". */}
      <div role="dialog" aria-modal="true" aria-label="Kartu progres" className="relative flex w-full max-w-xs flex-col items-center gap-3">
        <div className="relative w-full overflow-hidden rounded-[28px] shadow-overlay ring-1 ring-white/10">
          <canvas
            ref={canvasRef}
            width={STORY_WIDTH}
            height={STORY_HEIGHT}
            className="block aspect-[9/16] w-full bg-[#0d1d42]"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/80 hover:bg-black/50"
          >
            ✕
          </button>
        </div>
        <Button onClick={handleShare} disabled={!ready || pending} className="w-full py-3">
          {pending ? "Menyiapkan..." : "📤 Bagikan ke Story"}
        </Button>
        {error && <p className="text-center text-sm text-red-300">{error}</p>}
        <button type="button" onClick={onClose} className="text-sm text-white/70 hover:text-white">
          Nanti saja
        </button>
      </div>
    </div>
  );
}
