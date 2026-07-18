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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateLabel = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

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

  async function buildImageFile(): Promise<File> {
    if (!cardRef.current) throw new Error("card not ready");
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], `olympus-pr-${Date.now()}.png`, { type: "image/png" });
  }

  async function handleShare() {
    setError(null);
    setPending(true);
    try {
      const file = await buildImageFile();
      const shareText = data.isDebut
        ? `Baru aja mulai catat ${data.exerciseName} di OLYMPUS Lifting Club! ${data.weight}kg x ${data.reps} 💪`
        : `Baru aja PR ${data.exerciseName} ${data.weight}kg x ${data.reps} di OLYMPUS Lifting Club! 💪`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "OLYMPUS Lifting Club", text: shareText });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        setError("Gagal menyiapkan gambar. Coba lagi.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
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

        <Button onClick={handleShare} disabled={pending} className="w-full">
          {pending ? "Menyiapkan..." : "📤 Bagikan Gambar"}
        </Button>
        <button onClick={onClose} className="text-sm text-nav-muted hover:text-nav-foreground">
          Nanti saja
        </button>
      </div>
    </div>
  );
}
