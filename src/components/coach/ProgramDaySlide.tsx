"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { type SlotLike } from "@/lib/programRounds";
import { buildSlideRounds } from "@/lib/programSlide";
import { type MovementOption } from "@/components/coach/MovementCombobox";
import { ProgramSlide, useAppQrCode } from "@/components/shared/ProgramSlide";
import { slideFileName, useSlideExporter } from "@/components/shared/SlideExporter";

interface ProgramDaySlideProps {
  dayLabel: string;
  focusLabel: string;
  slots: SlotLike[];
  movements: MovementOption[];
}

// The full class slide (title, QR, logo, sticker, rounds) in the Olympus
// Canva layout, so coaches can show or download it directly instead of
// retyping the program into Canva. Members see the same slide in the app.
export function ProgramDaySlide({ dayLabel, focusLabel, slots, movements }: ProgramDaySlideProps) {
  const qr = useAppQrCode();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const movementById = new Map(movements.map((m) => [m.id, m]));
  const data = {
    dayLabel,
    title: focusLabel.trim() || dayLabel,
    rounds: buildSlideRounds(
      slots
        .filter((s) => s.movementId)
        .map((s) => ({
          slotLabel: s.slotLabel,
          movementName: movementById.get(s.movementId)?.name ?? "",
          sets: s.sets,
          repTarget: s.repTarget,
          roundScheme: s.roundScheme,
          note: s.note,
        }))
    ),
  };
  const exporter = useSlideExporter(data, qr);

  async function handleDownload() {
    setError(null);
    setPending(true);
    try {
      const file = await exporter.exportPng(slideFileName(data));
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Slide download failed:", e);
      setError("Gagal membuat gambar. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <ProgramSlide data={data} qrDataUrl={qr} />
      </div>
      <p className="text-xs text-muted">Slide ini juga yang dilihat member di menu Program.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={handleDownload} disabled={pending} className="self-start px-6">
        {pending ? "Menyiapkan..." : "📥 Download Slide (1920×1080)"}
      </Button>
      {exporter.element}
    </div>
  );
}
