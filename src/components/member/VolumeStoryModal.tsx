"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import fixWebmDuration from "fix-webm-duration";
import { Button } from "@/components/ui/Button";
import { shareOrDownload } from "@/lib/shareFile";
import { pickVideoMimeType } from "@/lib/videoFormat";
import {
  STORY_DURATION,
  STORY_HEIGHT,
  STORY_WIDTH,
  drawVolumeFrame,
  loadStoryAssets,
  type LifterCharacter,
  shareCaption,
  type VolumeStoryAssets,
  type VolumeStoryData,
  DEFAULT_SKIN_TONE,
  saveStoryPrefs,
  type SkinTone,
} from "@/lib/volumeStory";
import { SkinTonePicker, StoryCharacterPicker } from "@/components/member/StoryCharacterPicker";

interface VolumeStoryModalProps {
  data: VolumeStoryData;
  /** From the member's account; null = never picked, so ask first. */
  initialCharacter: LifterCharacter | null;
  initialSkinTone: SkinTone | null;
  onCharacterChange?: (character: LifterCharacter) => void;
  onSkinToneChange?: (skinTone: SkinTone) => void;
  onClose: () => void;
}

/**
 * "Gerakan Selesai" story card: the animated total-volume clip for one
 * exercise. The preview, the shared video and the shared image all come
 * from the same canvas renderer (lib/volumeStory), so what members see is
 * exactly what gets posted.
 */
export function VolumeStoryModal({
  data: baseData,
  initialCharacter,
  initialSkinTone,
  onCharacterChange,
  onSkinToneChange,
  onClose,
}: VolumeStoryModalProps) {
  // The member picks which lifter appears and its skin tone; saved on their account.
  const [character, setCharacter] = useState<LifterCharacter | null>(initialCharacter);
  const [skinTone, setSkinTone] = useState<SkinTone>(initialSkinTone ?? DEFAULT_SKIN_TONE);
  const data = useMemo(
    () => ({ ...baseData, character: character ?? "pria", skinTone }),
    [baseData, character, skinTone]
  );

  const previewRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<VolumeStoryAssets | null>(null);
  // While a video records, the recorder owns the preview canvas.
  const recordingRef = useRef(false);
  const [playKey, setPlayKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [imagePending, setImagePending] = useState(false);
  const [videoPending, setVideoPending] = useState(false);
  // navigator.share() needs a fresh tap, so (like the PR card) the video is
  // built on the first tap and shared on a second one.
  const [videoReady, setVideoReady] = useState<File | null>(null);
  const [videoSupported, setVideoSupported] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickCharacter(c: LifterCharacter) {
    setCharacter(c);
    setVideoReady(null);
    onCharacterChange?.(c);
    // Fire-and-forget: the card works the same even if saving fails. The
    // skin tone goes along so a first-time pick stores both.
    void saveStoryPrefs({ character: c, skinTone });
  }

  function pickSkinTone(t: SkinTone) {
    setSkinTone(t);
    setVideoReady(null);
    onSkinToneChange?.(t);
    void saveStoryPrefs(character ? { character, skinTone: t } : { skinTone: t });
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
      if (recordingRef.current) return;
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
    const mimeType = pickVideoMimeType();
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
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
    });

    const start = performance.now();
    const total = STORY_DURATION + 0.6;
    const previewCtx = previewRef.current?.getContext("2d") ?? null;
    let lastShown = -1;
    recordingRef.current = true;
    recorder.start();
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const t = (now - start) / 1000;
        // Hold the last frame a moment so the logo isn't cut off.
        drawVolumeFrame(ctx, assets, data, Math.min(t, STORY_DURATION));
        // Mirror the recording into the preview so members watch it build.
        previewCtx?.drawImage(canvas, 0, 0);
        const pct = Math.min(99, Math.floor((t / total) * 100));
        if (pct !== lastShown) {
          lastShown = pct;
          setVideoProgress(pct);
        }
        if (t < total) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    recordingRef.current = false;
    setVideoProgress(null);
    const elapsedMs = performance.now() - start;
    recorder.stop();
    const raw = await done;
    const blob = mimeType.startsWith("video/webm") ? await fixWebmDuration(raw, elapsedMs, { logger: false }) : raw;
    const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    return new File([blob], `olympus-volume-${Date.now()}.${ext}`, { type: mimeType.split(";")[0] });
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
      setVideoProgress(null);
      recordingRef.current = false;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-md">
      {/* No tap-outside-to-close: members kept dismissing the card by accident
          before sharing. Only ✕ / "Nanti saja" close it. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kartu volume gerakan"
        className="relative flex w-full max-w-xs flex-col items-center gap-3"
      >
        {character === null ? (
          <div className="relative flex w-full flex-col items-center gap-4 rounded-[28px] bg-[#0d1d42] px-5 py-8 text-center shadow-overlay ring-1 ring-white/10">
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/80 hover:bg-black/50"
            >
              ✕
            </button>
            <p className="text-3xl">🏋️</p>
            <div>
              <h2 className="font-display text-xl font-bold text-white">Pilih karakter kamu</h2>
              <p className="mt-1 text-sm text-white/70">
                Karakter ini yang akan mengangkat beban di kartumu. Bisa diganti kapan saja di halaman Akun.
              </p>
            </div>
            <SkinTonePicker value={skinTone} onChange={pickSkinTone} tone="dark" />
            <StoryCharacterPicker value={null} onChange={pickCharacter} tone="dark" />
          </div>
        ) : (
          <>
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
              {videoProgress !== null && (
                <div className="absolute inset-x-4 bottom-4 flex flex-col gap-1.5 rounded-xl bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                  <span>Membuat video... {videoProgress}%</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${videoProgress}%` }} />
                  </div>
                </div>
              )}
              <button
                type="button"
                hidden={videoProgress !== null}
                onClick={() => setPlayKey((k) => k + 1)}
                className="absolute bottom-3 right-3 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white/90 hover:bg-black/50"
              >
                ↻ Putar ulang
              </button>
            </div>
            <StoryCharacterPicker value={character} onChange={pickCharacter} tone="dark" disabled={videoPending} />
            <SkinTonePicker value={skinTone} onChange={pickSkinTone} tone="dark" disabled={videoPending} />
          </>
        )}

        {character !== null && videoSupported && (
          <Button onClick={handleShareVideo} disabled={!ready || videoPending} className="w-full py-3">
            {videoPending
              ? videoReady
                ? "Membuka..."
                : `Membuat video... ${videoProgress ?? 0}%`
              : videoReady
                ? "📤 Video siap, bagikan sekarang"
                : "🎬 Bagikan Video ke Story"}
          </Button>
        )}
        {character !== null && (
        <Button
          variant={videoSupported ? "secondary" : "primary"}
          onClick={handleShareImage}
          disabled={!ready || imagePending}
          className="w-full py-3"
        >
          {imagePending ? "Menyiapkan..." : "📤 Bagikan Gambar"}
        </Button>
        )}
        {error && <p className="text-center text-sm text-red-300">{error}</p>}
        <button type="button" onClick={onClose} className="text-sm text-white/70 hover:text-white">
          Nanti saja
        </button>
      </div>
    </div>
  );
}
