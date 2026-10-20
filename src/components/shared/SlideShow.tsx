"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProgramSlide, useAppQrCode } from "@/components/shared/ProgramSlide";
import type { ProgramSlideData } from "@/lib/programSlide";

interface SlideShowProps {
  slides: (ProgramSlideData & { isToday?: boolean })[];
  startIndex?: number;
  onClose: () => void;
}

const HIDE_CONTROLS_MS = 2500;

/**
 * Presents program slides straight from the app — on the class TV/laptop
 * or a phone — instead of downloading them into Canva first. Goes browser
 * full screen, keeps the screen awake, and moves with ← → / space / a tap
 * on either half of the screen.
 */
export function SlideShow({ slides, startIndex = 0, onClose }: SlideShowProps) {
  const qr = useAppQrCode();
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(Math.min(Math.max(0, startIndex), slides.length - 1));
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [go, close, showControls, slides.length]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Slideshow program"
      onMouseMove={showControls}
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black ${controls ? "" : "cursor-none"}`}
    >
      <div className="w-[min(100vw,calc(100dvh*16/9))]">
        <ProgramSlide data={slide} qrDataUrl={qr} />
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
        <div className="pointer-events-auto flex items-center gap-2">
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
  );
}
