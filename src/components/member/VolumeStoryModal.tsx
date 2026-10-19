"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import fixWebmDuration from "fix-webm-duration";
import { Button } from "@/components/ui/Button";
import { shareOrDownload } from "@/lib/shareFile";
import {
  STORY_DURATION,
  STORY_HEIGHT,
  STORY_WIDTH,
  LIFTER_CHARACTERS,
  drawVolumeFrame,
  loadStoryAssets,
  type LifterCharacter,
  shareCaption,
  type VolumeStoryAssets,
  type VolumeStoryData,
} from "@/lib/volumeStory";

interface VolumeStoryModalProps {
  data: VolumeStoryData;
  onClose: () => void;
}

/**
 * "Gerakan Selesai" story card: the animated total-volume clip for one
 * exercise. The preview, the shared video and the shared image all come
 * from the same canvas renderer (lib/volumeStory), so what members see is
 * exactly what gets posted.
 */
const CHARACTER_KEY = "olympus-story-character";

function savedCharacter(): LifterCharacter {
  try {
    const v = localStorage.getItem(CHARACTER_KEY);
    if (v === "pria" || v === "wanita" || v === "hijab") return v;
  } catch {
    // Storage blocked (private mode etc.) — just use the default.
  }
  return "pria";
}

export function VolumeStoryModal({ data: baseData, onClose }: VolumeStoryModalProps) {
  // The member picks which lifter appears; remembered for next time.
  const [character, setCharacter] = useState<LifterCharacter>(savedCharacter);
  const data = useMemo(() => ({ ...baseData, character }), [baseData, character]);

  const previewRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<VolumeStoryAssets | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [imagePending, setImagePending] = useState(false);
  const [videoPending, setVideoPending] = useState(false);
  // navigator.share() needs a fresh tap, so (like the PR card) the video is
  // built on the first tap and shared on a second one.
  const [videoReady, setVideoReady] = useState<File | null>(null);
  const [videoSupported, setVideoSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickCharacter(c: LifterCharacter) {
    setCharacter(c);
    setVideoReady(null);
    try {
      localStorage.setItem(CHARACTER_KEY, c);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;
    loadStoryAssets().then((assets) => {
      if (cancelled) return;
      assetsRef.current = assets;
      setVideoSupported(
        typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function"
      );
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live preview: play the timeline once, then hold on the final frame.
  useEffect(() => {
    const canvas = previewRef.current;
    const assets = assetsRef.current;
    if (!ready || !canvas || !assets) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min((now - start) / 1000, STORY_DURATION);
      drawVolumeFrame(ctx, assets, data, t);
      if (t < STORY_DURATION) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ready, data, playKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function makeCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak didukung di perangkat ini.");
    return { canvas, ctx };
  }

  async function buildImageFile(): Promise<File> {
    const assets = assetsRef.current;
    if (!assets) throw new Error("Kartu belum siap.");
    const { canvas, ctx } = makeCanvas();
    drawVolumeFrame(ctx, assets, data, STORY_DURATION);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Gagal membuat gambar.");
    return new File([blob], `olympus-volume-${Date.now()}.png`, { type: "image/png" });
  }

  async function buildVideoFile(): Promise<File> {
    const assets = assetsRef.current;
    if (!assets) throw new Error("Kartu belum siap.");
    // MP4 first: Android's share sheet rejects WebM on real devices (see
    // PRCelebrationModal); WebM only as a fallback, with duration patched.
    const mimeType = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((type) =>
      MediaRecorder.isTypeSupported(type)
    );
    if (!mimeType) throw new Error("Video tidak didukung di perangkat ini.");

    const { canvas, ctx } = makeCanvas();
    drawVolumeFrame(ctx, assets, data, 0);
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    const start = performance.now();
    recorder.start();
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const t = (now - start) / 1000;
        // Hold the last frame a moment so the logo isn't cut off.
        drawVolumeFrame(ctx, assets, data, Math.min(t, STORY_DURATION));
        if (t < STORY_DURATION + 0.6) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    const elapsedMs = performance.now() - start;
    recorder.stop();
    const raw = await done;
    const blob = mimeType.startsWith("video/webm") ? await fixWebmDuration(raw, elapsedMs, { logger: false }) : raw;
    const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    return new File([blob], `olympus-volume-${Date.now()}.${ext}`, { type: mimeType });
  }

  function reportError(prefix: string, e: unknown) {
    if ((e as { name?: string }).name === "AbortError") return;
    console.error(prefix, e);
    const detail = e instanceof Error && e.message ? ` (${e.message})` : "";
    setError(`${prefix}${detail}`);
  }

  async function handleShareImage() {
    setError(null);
    setImagePending(true);
    try {
      await shareOrDownload(await buildImageFile(), shareCaption(data));
    } catch (e) {
      reportError("Gagal menyiapkan gambar. Coba lagi.", e);
    } finally {
      setImagePending(false);
    }
  }

  async function handleShareVideo() {
    setError(null);
    setVideoPending(true);
    try {
      if (videoReady) {
        await shareOrDownload(videoReady, shareCaption(data));
        setVideoReady(null);
      } else {
        setVideoReady(await buildVideoFile());
      }
    } catch (e) {
      reportError(videoReady ? "Gagal membagikan video. Coba lagi." : "Gagal menyiapkan video. Coba lagi.", e);
    } finally {
      setVideoPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kartu volume gerakan"
        className="relative flex w-full max-w-xs flex-col items-center gap-3"
      >
        <div className="relative w-full overflow-hidden rounded-[28px] shadow-overlay ring-1 ring-white/10">
          <canvas
            ref={previewRef}
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
          <button
            type="button"
            onClick={() => setPlayKey((k) => k + 1)}
            className="absolute bottom-3 right-3 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white/90 hover:bg-black/50"
          >
            ↻ Putar ulang
          </button>
        </div>

        <div role="radiogroup" aria-label="Pilih karakter" className="grid w-full grid-cols-3 gap-2">
          {LIFTER_CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={character === c.id}
              onClick={() => pickCharacter(c.id)}
              disabled={videoPending}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                character === c.id
                  ? "bg-accent text-white ring-2 ring-white/70"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <span className="text-xl leading-none">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>

        {videoSupported && (
          <Button onClick={handleShareVideo} disabled={!ready || videoPending} className="w-full py-3">
            {videoPending
              ? videoReady
                ? "Membuka..."
                : "Menyiapkan video (±10 detik)..."
              : videoReady
                ? "📤 Video siap, bagikan sekarang"
                : "🎬 Bagikan Video ke Story"}
          </Button>
        )}
        <Button
          variant={videoSupported ? "secondary" : "primary"}
          onClick={handleShareImage}
          disabled={!ready || imagePending}
          className="w-full py-3"
        >
          {imagePending ? "Menyiapkan..." : "📤 Bagikan Gambar"}
        </Button>
        {error && <p className="text-center text-sm text-red-300">{error}</p>}
        <button type="button" onClick={onClose} className="text-sm text-white/70 hover:text-white">
          Nanti saja
        </button>
      </div>
    </div>
  );
}
