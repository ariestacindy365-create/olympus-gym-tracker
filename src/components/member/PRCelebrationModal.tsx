"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti";
import fixWebmDuration from "fix-webm-duration";
import { Button } from "@/components/ui/Button";

export interface PRCelebrationData {
  memberName: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  isDebut: boolean;
}

interface PRCelebrationModalProps {
  data: PRCelebrationData;
  onClose: () => void;
}

const ACCENT = "#2563eb";
const ACCENT_MUTED = "#64748b";

export function PRCelebrationModal({ data, onClose }: PRCelebrationModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imagePending, setImagePending] = useState(false);
  const [videoPending, setVideoPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoSupported, setVideoSupported] = useState(false);
  // navigator.share() must run inside a fresh user gesture — it can't be
  // called after the multi-second async video build, or browsers reject it
  // ("Must be handling a user gesture"). So building and sharing become two
  // taps: the first builds the file, the second (a brand new click) shares it.
  const [videoReady, setVideoReady] = useState<File | null>(null);

  const dateLabel = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    setVideoSupported(
      typeof MediaRecorder !== "undefined" &&
        typeof HTMLCanvasElement !== "undefined" &&
        typeof HTMLCanvasElement.prototype.captureStream === "function"
    );
  }, []);

  useEffect(() => {
    const colors = [ACCENT, "#60a5fa", "#ffffff", "#facc15"];

    confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.55 }, colors, zIndex: 60 });

    const end = Date.now() + 2000;
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, zIndex: 60 });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, zIndex: 60 });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  function shareText() {
    return data.isDebut
      ? `Baru aja mulai catat ${data.exerciseName} di OLYMPUS Lifting Club! ${data.weight}kg x ${data.reps} 💪`
      : `Baru aja PR ${data.exerciseName} ${data.weight}kg x ${data.reps} di OLYMPUS Lifting Club! 💪`;
  }

  async function shareOrDownload(file: File) {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "OLYMPUS Lifting Club", text: shareText() });
        return;
      } catch (e) {
        // User closed the share sheet themselves — respect that, don't
        // fall back to a surprise download they didn't ask for.
        if ((e as { name?: string }).name === "AbortError") throw e;
        // Any other failure (seen in the wild: "Permission denied" — some
        // Android/OEM builds block passing files to other apps via the
        // share sheet even though canShare() said it should work) — fall
        // through to a plain download so the file still reaches the user.
        console.error("navigator.share failed, falling back to download:", e);
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function buildImageFile(): Promise<File> {
    if (!cardRef.current) throw new Error("card not ready");
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], `olympus-pr-${Date.now()}.png`, { type: "image/png" });
  }

  async function handleShareImage() {
    setError(null);
    setImagePending(true);
    try {
      const file = await buildImageFile();
      await shareOrDownload(file);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        console.error("PR image share failed:", e);
        const detail = e instanceof Error && e.message ? ` (${e.message})` : "";
        setError(`Gagal menyiapkan gambar. Coba lagi.${detail}`);
      }
    } finally {
      setImagePending(false);
    }
  }

  async function buildVideoFile(): Promise<File> {
    if (!cardRef.current) throw new Error("card not ready");
    const node = cardRef.current;
    const scale = 2;
    const width = Math.round(node.offsetWidth * scale);
    const height = Math.round(node.offsetHeight * scale);

    const dataUrl = await toPng(node, { pixelRatio: scale });
    const cardImg = new Image();
    cardImg.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      cardImg.onload = () => resolve();
      cardImg.onerror = () => reject(new Error("Gagal memuat gambar kartu."));
    });

    const confettiCanvas = document.createElement("canvas");
    confettiCanvas.width = width;
    confettiCanvas.height = height;
    const confettiInCanvas = confetti.create(confettiCanvas, { resize: false, useWorker: false });

    const duration = 8000;

    const colors = [ACCENT, "#60a5fa", "#ffffff", "#facc15"];
    confettiInCanvas({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.5 }, colors });
    // Keep confetti falling for most of the clip so a longer video doesn't
    // go static for its back half — one more pop near the end for a finish.
    const burstEnd = Date.now() + duration * 0.7;
    (function burstFrame() {
      confettiInCanvas({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors });
      confettiInCanvas({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors });
      if (Date.now() < burstEnd) requestAnimationFrame(burstFrame);
    })();
    window.setTimeout(() => {
      confettiInCanvas({ particleCount: 60, spread: 90, startVelocity: 40, origin: { y: 0.5 }, colors });
    }, duration - 1200);

    // MP4 first: it's what actually gets accepted by the Android share
    // sheet on real devices — WebM made navigator.share() itself fail with
    // "Permission denied" (confirmed on-device; image/png sharing to the
    // same targets works fine, so this is specific to the video MIME type,
    // not a general share permission problem). WebM stays as a fallback for
    // devices that can't record MP4 at all, with its duration patched below
    // since MediaRecorder never writes real duration metadata for it.
    const mimeType = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) =>
      MediaRecorder.isTypeSupported(t)
    );
    if (!mimeType) throw new Error("Video tidak didukung di perangkat ini.");

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx2d = outputCanvas.getContext("2d");
    if (!ctx2d) throw new Error("Canvas tidak didukung di perangkat ini.");
    const ctx = ctx2d;

    const stream = outputCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const recordingDone = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    const recordingStart = performance.now();
    recorder.start();

    const introDuration = 350;
    const startTime = performance.now();
    await new Promise<void>((resolve) => {
      function draw(now: number) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / introDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const s = 0.85 + 0.15 * eased;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.globalAlpha = eased;
        ctx.translate(width / 2, height / 2);
        ctx.scale(s, s);
        ctx.translate(-width / 2, -height / 2);
        ctx.drawImage(cardImg, 0, 0, width, height);
        ctx.restore();
        ctx.drawImage(confettiCanvas, 0, 0, width, height);

        if (elapsed < duration) {
          requestAnimationFrame(draw);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(draw);
    });

    const actualDurationMs = performance.now() - recordingStart;
    recorder.stop();
    const rawBlob = await recordingDone;
    const blob = mimeType.startsWith("video/webm")
      ? await fixWebmDuration(rawBlob, actualDurationMs, { logger: false })
      : rawBlob;
    const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    return new File([blob], `olympus-pr-${Date.now()}.${ext}`, { type: mimeType });
  }

  async function handleShareVideo() {
    setError(null);

    if (videoReady) {
      // Second tap: this click is itself a fresh user gesture, so the
      // share/download call happens synchronously within it.
      setVideoPending(true);
      try {
        await shareOrDownload(videoReady);
        setVideoReady(null);
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") {
          console.error("PR video share failed:", e);
          const detail = e instanceof Error && e.message ? ` (${e.message})` : "";
          setError(`Gagal membagikan video. Coba lagi.${detail}`);
        }
      } finally {
        setVideoPending(false);
      }
      return;
    }

    setVideoPending(true);
    try {
      const file = await buildVideoFile();
      setVideoReady(file);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        console.error("PR video build failed:", e);
        const detail = e instanceof Error && e.message ? ` (${e.message})` : "";
        setError(`Gagal menyiapkan video. Coba lagi.${detail}`);
      }
    } finally {
      setVideoPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex w-full max-w-xs flex-col items-center gap-4">
        <div ref={cardRef} className="flex aspect-[9/16] w-full flex-col rounded-[32px] p-4" style={{ background: "#dbeafe" }}>
          <div
            className="relative flex flex-1 flex-col items-center justify-center rounded-3xl px-6 py-8 text-center"
            style={{ background: "#ffffff", border: `2px solid ${ACCENT}` }}
          >
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="absolute right-4 top-4 text-lg leading-none text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>

            <p className="font-display text-2xl font-bold uppercase tracking-wide text-slate-900">
              {data.memberName}
            </p>

            <p className="mt-2 text-sm font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
              {data.isDebut ? "✨ Debut Pertama" : "🔥 PR Baru!"}
            </p>

            <p className="mt-6 text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT_MUTED }}>
              {data.exerciseName}
            </p>

            <p className="mt-1 font-display text-6xl font-black" style={{ color: ACCENT }}>
              {data.weight}
              <span className="text-2xl font-bold">kg</span>
            </p>
            <p className="mt-1 text-base" style={{ color: ACCENT_MUTED }}>
              &times; {data.reps} reps
            </p>

            <div
              className="mx-auto mt-6 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold"
              style={{ background: ACCENT, color: "#ffffff" }}
            >
              {data.isDebut ? "✨ Angkatan Pertama Dicatat" : "🏆 Rekor Baru!"}
            </div>

            <p className="mt-3 text-xs" style={{ color: ACCENT_MUTED }}>
              {dateLabel}
            </p>

            <div className="my-6 h-px w-full bg-slate-200" />

            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- rendered off-DOM into a shareable PNG, next/image isn't applicable here */}
              <img src="/olympus-logo.png" alt="OLYMPUS" className="h-6 w-auto" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {videoSupported && (
          <Button onClick={handleShareVideo} disabled={videoPending || imagePending} className="w-full">
            {videoPending
              ? videoReady
                ? "Membagikan..."
                : "Merekam video..."
              : videoReady
                ? "✅ Video siap — tap untuk bagikan"
                : "🎬 Bagikan Video ke Story"}
          </Button>
        )}
        <Button
          variant={videoSupported ? "secondary" : "primary"}
          onClick={handleShareImage}
          disabled={videoPending || imagePending}
          className="w-full"
        >
          {imagePending ? "Menyiapkan..." : "📤 Bagikan Gambar"}
        </Button>
        <button onClick={onClose} className="text-sm text-nav-muted hover:text-nav-foreground">
          Nanti saja
        </button>
      </div>
    </div>
  );
}
