"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProgramSlide, useAppQrCode } from "@/components/shared/ProgramSlide";
import { SlideShow } from "@/components/shared/SlideShow";
import { slideFileName, useSlideExporter } from "@/components/shared/SlideExporter";
import { shareOrDownload } from "@/lib/shareFile";
import type { WeekProgramDay } from "@/lib/weekProgram";

interface ProgramWeekViewProps {
  weekNumber: number;
  days: WeekProgramDay[];
}

/** This week's class program as the same slides shown in class. */
export function ProgramWeekView({ weekNumber, days }: ProgramWeekViewProps) {
  const qr = useAppQrCode();
  const todayIndex = days.findIndex((d) => d.isToday);
  const [index, setIndex] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = days[index] ?? null;
  const exporter = useSlideExporter(day, qr);

  if (!day) {
    return (
      <p className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
        Program Minggu {weekNumber} belum diisi pelatih.
      </p>
    );
  }

  async function handleShare() {
    if (!day) return;
    setError(null);
    setPending(true);
    try {
      const file = await exporter.exportPng(slideFileName(day));
      await shareOrDownload(file, `Program ${day.dayLabel} — ${day.title} · OLYMPUS`);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") setError("Gagal menyiapkan gambar. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Hari" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d, i) => (
          <button
            key={d.dayLabel + i}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => setIndex(i)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
              i === index ? "bg-accent text-white" : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {d.dayLabel}
            {d.isToday && <span className={i === index ? "ml-1 text-white/80" : "ml-1 text-accent"}>· hari ini</span>}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setFullscreen(true)}
        aria-label="Putar slideshow"
        className="overflow-hidden rounded-xl border border-border shadow-card"
      >
        <ProgramSlide data={day} qrDataUrl={qr} />
      </button>
      <p className="text-center text-xs text-muted">Tap slide untuk slideshow layar penuh. Geser hari dengan tap kiri/kanan.</p>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setFullscreen(true)} className="flex-1">
          ▶ Slideshow
        </Button>
        <Button onClick={handleShare} disabled={pending} className="flex-1">
          {pending ? "Menyiapkan..." : "📤 Simpan / Bagikan"}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      {fullscreen && <SlideShow slides={days} startIndex={index} onClose={() => setFullscreen(false)} />}
      {exporter.element}
    </div>
  );
}
