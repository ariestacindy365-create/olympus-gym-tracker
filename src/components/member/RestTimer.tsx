"use client";

import { useEffect, useState } from "react";
import { restTimerDoneFeedback } from "@/lib/scanFeedback";

export const DEFAULT_REST_SECONDS = 90;
const STEP_SECONDS = 15;

interface RestTimerProps {
  /** When the rest started (ms epoch); a new value restarts the timer. */
  startedAt: number;
  onDismiss: () => void;
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Rest countdown that pops up after a set is logged. It sits just above the
 * member bottom nav so the next set's inputs stay visible, and beeps +
 * vibrates when the rest is over. Counting from a timestamp (not ticks)
 * keeps it right even if the phone throttles a backgrounded tab.
 */
export function RestTimer({ startedAt, onDismiss }: RestTimerProps) {
  const [duration, setDuration] = useState(DEFAULT_REST_SECONDS);
  const [now, setNow] = useState(startedAt);
  const [doneFired, setDoneFired] = useState(false);

  const remaining = duration - (now - startedAt) / 1000;
  const finished = remaining <= 0;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!finished || doneFired) return;
    restTimerDoneFeedback();
    // One-shot side effect when the countdown crosses zero.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDoneFired(true);
  }, [finished, doneFired]);

  // Auto-hide a little while after the rest is over.
  useEffect(() => {
    if (!finished) return;
    const id = setTimeout(onDismiss, 8000);
    return () => clearTimeout(id);
  }, [finished, onDismiss]);

  function adjust(delta: number) {
    setDuration((d) => Math.max(STEP_SECONDS, d + delta));
    setDoneFired(false);
  }

  const progress = Math.min(1, Math.max(0, 1 - remaining / duration));

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label="Timer istirahat"
      className="fixed inset-x-3 bottom-[5.5rem] z-30 mx-auto max-w-md overflow-hidden rounded-2xl bg-nav-bg text-nav-foreground shadow-overlay ring-1 ring-white/10 animate-pop-in sm:bottom-4"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-nav-muted">
            {finished ? "Istirahat selesai" : "Istirahat"}
          </p>
          <p className={`tabular font-display text-2xl font-bold ${finished ? "text-success" : "text-white"}`}>
            {finished ? "Ayo set berikutnya 💪" : formatClock(remaining)}
          </p>
        </div>
        {!finished && (
          <>
            <button
              type="button"
              onClick={() => adjust(-STEP_SECONDS)}
              aria-label="Kurangi 15 detik"
              className="h-10 rounded-lg bg-white/10 px-2.5 text-sm font-semibold hover:bg-white/20"
            >
              −15
            </button>
            <button
              type="button"
              onClick={() => adjust(STEP_SECONDS)}
              aria-label="Tambah 15 detik"
              className="h-10 rounded-lg bg-white/10 px-2.5 text-sm font-semibold hover:bg-white/20"
            >
              +15
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="h-10 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent/90"
        >
          {finished ? "Tutup" : "Lewati"}
        </button>
      </div>
      <div className="h-1 bg-white/10">
        <div
          className={`h-full transition-[width] duration-300 ${finished ? "bg-success" : "bg-accent"}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
