"use client";

import { useState } from "react";
import { SlideShow } from "@/components/shared/SlideShow";
import type { ProgramSlideData } from "@/lib/programSlide";

interface SlideShowButtonProps {
  slides: (ProgramSlideData & { isToday?: boolean })[];
  label?: string;
  className?: string;
}

/** "▶ Slideshow" — presents the slides full screen, starting at today's day, with barbell PR celebrations. */
export function SlideShowButton({ slides, label = "▶ Slideshow", className = "" }: SlideShowButtonProps) {
  const [open, setOpen] = useState(false);
  const start = Math.max(0, slides.findIndex((s) => s.isToday));
  if (slides.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/25 transition hover:bg-accent-2 ${className}`}
      >
        {label}
      </button>
      {open && <SlideShow slides={slides} startIndex={start} celebratePRs onClose={() => setOpen(false)} />}
    </>
  );
}
