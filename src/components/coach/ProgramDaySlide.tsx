"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/Button";
import { groupSlotsIntoRounds, type SlotLike } from "@/lib/programRounds";
import { type MovementOption } from "@/components/coach/MovementCombobox";

interface ProgramDaySlideProps {
  dayLabel: string;
  focusLabel: string;
  slots: SlotLike[];
  movements: MovementOption[];
}

// Just the Round 1/2/3... exercise grid as a clean image — the coach pastes
// this into their own Canva slide and adds the title/QR/logo by hand there,
// so this stays a plain content block instead of trying to reproduce a full
// slide layout (title/QR/logo positions vary per coach's Canva template).
export function ProgramDaySlide({ dayLabel, focusLabel, slots, movements }: ProgramDaySlideProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const movementById = new Map(movements.map((m) => [m.id, m]));
  const rounds = groupSlotsIntoRounds(slots.filter((s) => s.movementId));

  // Balance the two columns by content weight (not just round count) — a
  // plain half-and-half split by count can leave one column much taller
  // than the other when rounds have uneven exercise counts. Try every split
  // point (rounds are few, so this is cheap) and keep the most even one.
  const weights = rounds.map((r) => 2 + r.slots.length);
  const prefix = [0];
  for (const w of weights) prefix.push(prefix[prefix.length - 1] + w);
  const totalWeight = prefix[prefix.length - 1];
  let splitIndex = rounds.length;
  let bestMax = Infinity;
  for (let i = 1; i <= rounds.length; i++) {
    const left = prefix[i];
    const right = totalWeight - left;
    const columnMax = Math.max(left, right);
    if (columnMax < bestMax) {
      bestMax = columnMax;
      splitIndex = i;
    }
  }
  const columns = [rounds.slice(0, splitIndex), rounds.slice(splitIndex)];

  async function handleDownload() {
    setError(null);
    setPending(true);
    try {
      if (!cardRef.current) throw new Error("card not ready");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = `${dayLabel}-${focusLabel || "program"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.href = url;
      a.download = `olympus-round-${slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Round image download failed:", e);
      setError("Gagal membuat gambar. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <div ref={cardRef} className="bg-white" style={{ width: 900, padding: 32 }}>
          <div className="grid grid-cols-2" style={{ columnGap: 48, rowGap: 18 }}>
            {columns.map((col, colIndex) => (
              <div key={colIndex} className="flex flex-col" style={{ gap: 18 }}>
                {col.map((round, i) => {
                  const roundNumber = (colIndex === 0 ? 0 : splitIndex) + i + 1;
                  const schemeLine =
                    round.scheme && round.sets
                      ? `${round.scheme} (${round.sets} set)`
                      : round.scheme || (round.sets ? `${round.sets} set` : "");
                  return (
                    <div key={roundNumber}>
                      <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>
                        Round {roundNumber}
                      </p>
                      {schemeLine && (
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "2px 0 6px" }}>
                          {schemeLine}
                        </p>
                      )}
                      {round.slots.map((slot, si) => {
                        const name = movementById.get(slot.movementId)?.name ?? "";
                        return (
                          <p key={si} style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "1px 0" }}>
                            {slot.slotLabel ? `${slot.slotLabel}. ` : ""}
                            {name}
                            {slot.repTarget ? ` ${slot.repTarget} reps` : ""}
                          </p>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button onClick={handleDownload} disabled={pending} className="self-start px-6">
        {pending ? "Menyiapkan..." : "📥 Download Gambar Round"}
      </Button>
    </div>
  );
}
