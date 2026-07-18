"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface PRCelebrationData {
  memberName: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
}

interface PRCelebrationModalProps {
  data: PRCelebrationData;
  onClose: () => void;
}

export function PRCelebrationModal({ data, onClose }: PRCelebrationModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateLabel = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

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
      const shareText = `Baru aja PR ${data.exerciseName} ${data.weight}kg x ${data.reps} di OLYMPUS Lifting Club! 💪`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "PR Baru di OLYMPUS!", text: shareText });
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
    <Modal open onClose={onClose} title="Selamat! 🎉">
      <div className="flex flex-col items-center gap-4">
        <div
          ref={cardRef}
          className="relative flex aspect-[9/16] w-full max-w-[280px] flex-col items-center overflow-hidden rounded-2xl px-6 py-10 text-center"
          style={{ background: "linear-gradient(160deg, #1e3a8a 0%, #0f172a 75%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle at 30% 15%, #60a5fa55 0%, transparent 45%)" }}
          />

          <p className="relative mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            Personal Record
          </p>
          <p className="relative mt-2 font-display text-3xl font-black leading-tight text-white">PR BARU! 🎉</p>

          <div className="relative mt-10 flex flex-col items-center gap-1">
            <p className="text-base font-semibold text-white">{data.exerciseName}</p>
            <p className="font-display text-5xl font-black text-white">
              {data.weight}
              <span className="text-xl font-bold">kg</span>
            </p>
            <p className="text-sm text-blue-200">
              {data.reps} reps &middot; est. {data.estimated1RM.toFixed(1)}kg 1RM
            </p>
          </div>

          <div className="relative mt-10 flex flex-col items-center gap-0.5">
            <p className="text-sm font-semibold text-white">{data.memberName}</p>
            <p className="text-xs text-blue-200">{dateLabel}</p>
          </div>

          <div className="relative mt-auto flex items-center gap-2 pt-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered off-DOM into a shareable PNG, next/image isn't applicable here */}
            <img src="/olympus-logo-light.png" alt="OLYMPUS" className="h-6 w-auto" />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex w-full gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Tutup
          </Button>
          <Button onClick={handleShare} disabled={pending} className="flex-1">
            {pending ? "Menyiapkan..." : "Bagikan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
