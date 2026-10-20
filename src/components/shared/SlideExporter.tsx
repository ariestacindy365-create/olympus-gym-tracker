"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";
import { SLIDE_H, SLIDE_W, SlideCanvas } from "@/components/shared/ProgramSlide";
import type { ProgramSlideData } from "@/lib/programSlide";

/**
 * Keeps a full-size, off-screen copy of the slide so it can be exported at
 * 1920×1080 regardless of how small it's shown. Call `exportPng()` from the
 * returned ref holder.
 */
export function useSlideExporter(data: ProgramSlideData | null, qrDataUrl: string | null) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const element = data ? (
    <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, width: SLIDE_W, height: SLIDE_H, pointerEvents: "none" }}>
      <SlideCanvas ref={nodeRef} data={data} qrDataUrl={qrDataUrl} />
    </div>
  ) : null;

  async function exportPng(fileName: string): Promise<File> {
    if (!nodeRef.current) throw new Error("Slide belum siap.");
    await document.fonts?.ready;
    const dataUrl = await toPng(nodeRef.current, { pixelRatio: 1.2, width: SLIDE_W, height: SLIDE_H, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], fileName, { type: "image/png" });
  }

  return { element, exportPng };
}

export function slideFileName(data: ProgramSlideData) {
  return `olympus-${`${data.dayLabel}-${data.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;
}
