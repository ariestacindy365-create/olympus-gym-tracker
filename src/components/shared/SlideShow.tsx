"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProgramSlide, useAppQrCode } from "@/components/shared/ProgramSlide";
import type { ProgramSlideData } from "@/lib/programSlide";
import { ClassTimer } from "@/components/shared/ClassTimer";
import { timerFromScheme, type TimerConfig } from "@/lib/classTimer";
import { PRCelebration } from "@/components/shared/PRCelebration";

interface SlideShowProps {
  slides: (ProgramSlideData & { isToday?: boolean })[];
  startIndex?: number;
  /** Coach's class TV: celebrate members' barbell PRs over the slide. */
  celebratePRs?: boolean;
  onClose: () => void;
}

const PR_SOUND_KEY = "olympus-pr-sound";

const HIDE_CONTROLS_MS = 2500;

/**
 * Presents program slides straight from the app — on the class TV/laptop
 * or a phone — instead of downloading them into Canva first. Goes browser
 * full screen, keeps the screen awake, and moves with ← → / space / a tap
 * on either half of the screen.
 */
export function SlideShow({ slides, startIndex = 0, celebratePRs = false, onClose }: SlideShowProps) {
  const qr = useAppQrCode();
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(Math.min(Math.max(0, startIndex), slides.length - 1));
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The round timer sits in the right quarter (program stays readable on the
  // left 3/4) and can be blown up to full screen; `key` restarts it when
  // another round's ⏱ is tapped.
  const [timer, setTimer] = useState<{ key: number; config: TimerConfig; subtitle: string; slide: number; round: number } | null>(null);
  const [timerBig, setTimerBig] = useState(false);
  // PR celebration sound, remembered on this device (the gym TV).
  const [prSound, setPrSound] = useState(() => {
    try {
      return localStorage.getItem(PR_SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });
  function togglePrSound() {
    setPrSound((on) => {
      try {
        localStorage.setItem(PR_SOUND_KEY, on ? "off" : "on");
      } catch {
        // Storage blocked: the choice lasts for this slideshow only.
      }
      return !on;
    });
  }

  const showControls = useCallback(() => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), HIDE_CONTROLS_MS);
  }, []);

  const close = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onClose();
  }, [onClose]);

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + delta))),
    [slides.length]
  );

  // Full screen + keep the display awake while presenting.
  useEffect(() => {
    void rootRef.current?.requestFullscreen?.().catch(() => {});
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    const t = setTimeout(() => setControls(false), HIDE_CONTROLS_MS);
    return () => {
      clearTimeout(t);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      void lock?.release().catch(() => {});
    };
  }, []);

  // Leaving browser full screen (Esc) ends the slideshow too.
  useEffect(() => {
    let wasFull = false;
    function onChange() {
      if (document.fullscreenElement) wasFull = true;
      else if (wasFull) onClose();
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // While a timer is open it owns space / R / Esc; arrows still page the
      // slides when it's in the side panel.
      if (timer && (timerBig || !["ArrowRight", "ArrowLeft", "PageDown", "PageUp"].includes(e.key))) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex(slides.length - 1);
      else if (e.key === "Escape") close();
      showControls();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, close, showControls, slides.length, timer, timerBig]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Slideshow program"
      onMouseMove={showControls}
      className={`fixed inset-0 z-[60] flex flex-col bg-black landscape:flex-row ${controls ? "" : "cursor-none"}`}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center">
      <div
        className={`relative ${
          timer && !timerBig
            ? "w-[min(100vw,calc(58dvh*16/9))] landscape:w-[min(75vw,calc(100dvh*16/9))]"
            : "w-[min(100vw,calc(100dvh*16/9))]"
        }`}
      >
        <ProgramSlide data={slide} qrDataUrl={qr} highlightRound={timer && timer.slide === index ? timer.round : null} />
        {/* Over the slide only: the layout and the timer beside it never move. */}
        {celebratePRs && <PRCelebration sound={prSound} />}
      </div>

      {/* Tap left / right half to move */}
      <button type="button" aria-label="Slide sebelumnya" onClick={() => {
          go(-1);
          showControls();
        }} className="absolute inset-y-0 left-0 w-1/2 cursor-[inherit]" />
      <button type="button" aria-label="Slide berikutnya" onClick={() => {
          go(1);
          showControls();
        }} className="absolute inset-y-0 right-0 w-1/2 cursor-[inherit]" />

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10 text-white transition-opacity duration-300 ${
          controls ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-sm font-semibold">
          {slide.dayLabel}
          {slide.isToday && <span className="ml-1.5 rounded-full bg-accent px-2 py-0.5 text-xs">hari ini</span>}
          <span className="ml-2 text-white/60">
            {index + 1} / {slides.length}
          </span>
        </span>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {slide.rounds.map((r) => {
            const cfg = timerFromScheme(r.scheme, r.sets);
            if (!cfg) return null;
            return (
              <button
                key={r.number}
                type="button"
                onClick={() => {
                  setTimer({ key: Date.now(), config: cfg, subtitle: `Round ${r.number} · ${slide.title}`, slide: index, round: r.number });
                  setTimerBig(false);
                }}
                className="rounded-full bg-[#22c55e] px-3 py-2 text-xs font-bold text-black hover:brightness-110"
                title={r.schemeLine}
              >
                ⏱ R{r.number}
              </button>
            );
          })}
          {celebratePRs && (
            <button
              type="button"
              onClick={togglePrSound}
              aria-pressed={prSound}
              title="Suara selebrasi PR"
              className="rounded-full bg-black/70 px-3 py-2 text-xs font-semibold ring-1 ring-white/30 hover:bg-black/85"
            >
              {prSound ? "🔊 PR" : "🔇 PR"}
            </button>
          )}
          <button type="button" onClick={() => go(-1)} disabled={index === 0} className="rounded-full bg-black/70 px-4 py-2 text-sm font-semibold ring-1 ring-white/30 hover:bg-black/85 disabled:opacity-30">
            ‹
          </button>
          <button type="button" onClick={() => go(1)} disabled={index === slides.length - 1} className="rounded-full bg-black/70 px-4 py-2 text-sm font-semibold ring-1 ring-white/30 hover:bg-black/85 disabled:opacity-30">
            ›
          </button>
          <button type="button" onClick={close} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
            ✕ Keluar
          </button>
        </div>
      </div>
      </div>
      {timer && (
        <ClassTimer
          key={timer.key}
          variant={timerBig ? "overlay" : "side"}
          initial={timer.config}
          subtitle={timer.subtitle}
          onToggleSize={() => setTimerBig((b) => !b)}
          onClose={() => setTimer(null)}
        />
      )}
    </div>
  );
}
