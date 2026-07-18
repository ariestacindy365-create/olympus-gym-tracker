"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti";
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

const POP = "#60a5fa";

export function PRCelebrationModal({ data, onClose }: PRCelebrationModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imagePending, setImagePending] = useState(false);
  const [videoPending, setVideoPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoSupported, setVideoSupported] = useState(false);

  const dateLabel = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    setVideoSupported(
      typeof MediaRecorder !== "undefined" &&
        typeof HTMLCanvasElement !== "undefined" &&
        typeof HTMLCanvasElement.prototype.captureStream === "function"
    );
  }, []);

  useEffect(() => {
    const colors = [POP, "#2563eb", "#ffffff", "#facc15"];

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
      await navigator.share({ files: [file], title: "OLYMPUS Lifting Club", text: shareText() });
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function buildImageFile(): Promise<File> {
    if (!cardRef.current) throw new Error("card not ready");
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
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
        setError("Gagal menyiapkan gambar. Coba lagi.");
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

    const dataUrl = await toPng(node, { pixelRatio: scale, cacheBust: true });
    const cardImg = new Image();
    cardImg.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      cardImg.onload = () => resolve();
      cardImg.onerror = () => reject(new Error("failed to load card image"));
    });

    const confettiCanvas = document.createElement("canvas");
    confettiCanvas.width = width;
    confettiCanvas.height = height;
    const confettiInCanvas = confetti.create(confettiCanvas, { resize: false, useWorker: false });

    const colors = [POP, "#2563eb", "#ffffff", "#facc15"];
    confettiInCanvas({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.5 }, colors });
    const burstEnd = Date.now() + 1800;
    (function burstFrame() {
      confettiInCanvas({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors });
      confettiInCanvas({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors });
      if (Date.now() < burstEnd) requestAnimationFrame(burstFrame);
    })();

    const mimeType = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find(
      (t) => MediaRecorder.isTypeSupported(t)
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

    recorder.start();

    const duration = 3000;
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

    recorder.stop();
    const blob = await recordingDone;
    const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    return new File([blob], `olympus-pr-${Date.now()}.${ext}`, { type: mimeType });
  }

  async function handleShareVideo() {
    setError(null);
    setVideoPending(true);
    try {
      const file = await buildVideoFile();
      await shareOrDownload(file);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        setError("Gagal menyiapkan video. Coba lagi.");
      }
    } finally {
      setVideoPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-4">
        <div ref={cardRef} className="w-full rounded-[32px] p-5" style={{ background: "#080d18" }}>
          <div
            className="relative rounded-3xl px-6 py-8 text-center"
            style={{ background: "#0f172a", border: `2px solid ${POP}` }}
          >
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="absolute right-4 top-4 text-lg leading-none text-nav-muted hover:text-nav-foreground"
            >
              ✕
            </button>

            <p className="font-display text-2xl font-bold uppercase tracking-wide text-white">{data.memberName}</p>

            <p className="mt-2 text-sm font-bold uppercase tracking-widest" style={{ color: POP }}>
              {data.isDebut ? "✨ Debut Pertama" : "🔥 PR Baru!"}
            </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-nav-muted">{data.exerciseName}</p>

            <p className="mt-1 font-display text-6xl font-black" style={{ color: POP }}>
              {data.weight}
              <span className="text-2xl font-bold">kg</span>
            </p>
            <p className="mt-1 text-base text-nav-muted">&times; {data.reps} reps</p>

            <div
              className="mx-auto mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold"
              style={{ background: POP, color: "#0f172a" }}
            >
              {data.isDebut ? "✨ Angkatan Pertama Dicatat" : "🏆 Rekor Baru!"}
            </div>

            <p className="mt-3 text-xs text-nav-muted">{dateLabel}</p>

            <div className="my-5 h-px w-full bg-white/10" />

            {/* eslint-disable-next-line @next/next/no-img-element -- rendered off-DOM into a shareable PNG, next/image isn't applicable here */}
            <img src="/olympus-logo-light.png" alt="OLYMPUS" className="mx-auto h-6 w-auto" />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {videoSupported && (
          <Button onClick={handleShareVideo} disabled={videoPending || imagePending} className="w-full">
            {videoPending ? "Merekam video..." : "🎬 Bagikan Video ke Story"}
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
