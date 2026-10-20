"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_SKIN_TONE,
  STORY_DURATION,
  STORY_HEIGHT,
  STORY_WIDTH,
  drawVolumeFrame,
  formatKg,
  loadStoryAssets,
  pickEquivalent,
  storySummary,
  totalVolume,
  type LifterCharacter,
  type SkinTone,
  type VolumeStoryAssets,
  type VolumeStorySet,
} from "@/lib/volumeStory";

// The preview shows only the lift scene of the story card (the bottom part).
const CROP_TOP = 990;
const CROP_HEIGHT = 700;

interface WorkoutDoneSheetProps {
  memberName: string;
  exerciseName: string;
  sets: VolumeStorySet[];
  /** Today's best PR set for this exercise, if any. */
  prSet: { weight: number; reps: number } | null;
  /** kg above the best weight before today (null = first time / unknown). */
  prGain: number | null;
  character: LifterCharacter | null;
  skinTone: SkinTone | null;
  onSharePR: () => void;
  onShareVolume: () => void;
  onClose: () => void;
}

/**
 * Shown when a member taps "Selesai <gerakan>": one screen that wraps up the
 * exercise (total volume, the lift scene, any PR) and leads to sharing.
 * Like the share cards, it only closes from its own buttons.
 */
export function WorkoutDoneSheet({
  memberName,
  exerciseName,
  sets,
  prSet,
  prGain,
  character,
  skinTone,
  onSharePR,
  onShareVolume,
  onClose,
}: WorkoutDoneSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [assets, setAssets] = useState<VolumeStoryAssets | null>(null);
  const volume = totalVolume(sets);
  const eq = pickEquivalent(volume);
  const firstName = memberName.trim().split(/\s+/)[0] ?? memberName;
  const data = useMemo(
    () => ({ memberName, exerciseName, sets, character: character ?? "pria", skinTone: skinTone ?? DEFAULT_SKIN_TONE }),
    [memberName, exerciseName, sets, character, skinTone]
  );

  useEffect(() => {
    let cancelled = false;
    loadStoryAssets().then((a) => {
      if (!cancelled) setAssets(a);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Play the lift once (from where the object runs in), then hold.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!assets || !ctx) return;
    const full = document.createElement("canvas");
    full.width = STORY_WIDTH;
    full.height = STORY_HEIGHT;
    const fctx = full.getContext("2d");
    if (!fctx) return;
    let raf = 0;
    const start = performance.now();
    const from = 4.0;
    const frame = (now: number) => {
      const t = Math.min(from + (now - start) / 1000, STORY_DURATION);
      drawVolumeFrame(fctx, assets, data, t);
      ctx.drawImage(full, 0, CROP_TOP, STORY_WIDTH, CROP_HEIGHT, 0, 0, STORY_WIDTH, CROP_HEIGHT);
      if (t < STORY_DURATION) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [assets, data]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${exerciseName} selesai`}
      className="fixed inset-0 z-40 overflow-y-auto bg-nav-bg text-nav-foreground animate-fade-in [background-image:radial-gradient(40rem_24rem_at_50%_0%,rgb(37_99_235/0.35),transparent)]"
    >
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center gap-4 px-4 pb-8 pt-8 text-center">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <div>
          <h2 className="font-display text-3xl font-bold text-white">Selamat, {firstName}!</h2>
          <p className="mt-1 text-sm text-nav-muted">
            <span className="font-semibold text-white">{exerciseName}</span> beres — lanjut gerakan berikutnya 🔥
          </p>
        </div>

        <div>
          <p className="tabular font-display text-6xl font-bold leading-none text-[#60a5fa]">
            {formatKg(volume)}
            <span className="ml-1.5 text-2xl text-white">kg</span>
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">Total Volume</p>
          <p className="mt-1 text-xs text-nav-muted">{storySummary(sets)}</p>
        </div>

        <div className="w-full overflow-hidden rounded-3xl bg-[#0d1d42] ring-1 ring-white/10">
          <canvas
            ref={canvasRef}
            width={STORY_WIDTH}
            height={CROP_HEIGHT}
            className="block w-full"
            style={{ aspectRatio: `${STORY_WIDTH} / ${CROP_HEIGHT}` }}
          />
          <div className="px-4 pb-4">
            <p className="text-sm font-semibold text-white">
              Setara mengangkat {formatKg(eq.factor)}× {eq.name} {eq.emoji}
            </p>
            <Link href="/member/account#karakter" className="mt-1 inline-block text-xs text-nav-muted underline-offset-2 hover:underline">
              {character ? "Ganti karakter di Akun" : "Pilih karakter kamu di Akun"}
            </Link>
          </div>
        </div>

        {prSet && (
          <div className="w-full rounded-2xl bg-accent/20 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-accent/50">
            🏆 REKOR PRIBADI BARU · {formatKg(prSet.weight)} kg × {prSet.reps}
            {prGain != null && prGain > 0 && <span className="text-[#93c5fd]"> · +{formatKg(prGain)} kg</span>}
          </div>
        )}

        <div className="flex w-full flex-col gap-2">
          {prSet && (
            <Button onClick={onSharePR} className="w-full py-3">
              🏆 Bagikan Rekor ke Story
            </Button>
          )}
          <Button variant={prSet ? "secondary" : "primary"} onClick={onShareVolume} className="w-full py-3">
            🎬 Bagikan Volume ke Story
          </Button>
          <button type="button" onClick={onClose} className="py-2 text-sm text-nav-muted hover:text-white">
            Tutup
          </button>
        </div>
        <p className="text-xs text-nav-muted">Tap &quot;Bagikan&quot; → pilih Instagram Stories atau WhatsApp</p>
      </div>
    </div>
  );
}
