"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { type MovementOption } from "@/components/coach/MovementCombobox";
import { type SlotState } from "@/components/coach/SortableSlotRow";

interface DayState {
  dayLabel: string;
  focusLabel: string;
  slots: SlotState[];
}

interface ProgramWeekPreviewProps {
  weekNumber: number;
  days: DayState[];
  movements: MovementOption[];
  onEdit: () => void;
}

function buildProgramText(weekNumber: number, days: DayState[], movementById: Map<string, MovementOption>): string {
  const lines: string[] = [`PROGRAM MINGGU ${weekNumber}`, ""];
  for (const day of days) {
    lines.push(day.focusLabel ? `${day.dayLabel} — ${day.focusLabel}` : day.dayLabel);
    const slots = day.slots.filter((s) => s.movementId);
    if (slots.length === 0) {
      lines.push("(belum ada gerakan)");
    }
    for (const slot of slots) {
      const name = movementById.get(slot.movementId)?.name ?? "(gerakan tidak ditemukan)";
      const setsReps = [slot.sets, slot.repTarget].filter(Boolean).join("x");
      const parts = [slot.slotLabel.trim() ? `${slot.slotLabel.trim()}.` : null, name, setsReps || null].filter(
        Boolean
      );
      let line = parts.join(" ");
      if (slot.targetWeight) line += ` @${slot.targetWeight}kg`;
      if (slot.note.trim()) line += ` (${slot.note.trim()})`;
      lines.push(line);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

// Read-only, single-column rendering of a whole week's program — meant to
// be glanced at as one page and copied out as plain text for sharing (e.g.
// pasting into WhatsApp), rather than the input-heavy editable table.
export function ProgramWeekPreview({ weekNumber, days, movements, onEdit }: ProgramWeekPreviewProps) {
  const [copied, setCopied] = useState(false);
  const movementById = new Map(movements.map((m) => [m.id, m]));

  async function handleCopy() {
    const text = buildProgramText(weekNumber, days, movementById);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, non-HTTPS, older Safari)
      // — fall back to a manual-copy prompt so the coach isn't stuck.
      window.prompt("Salin manual (Ctrl+C atau Cmd+C, lalu Enter):", text);
    }
  }

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg bg-[#0f172a] px-4 py-3">
        <span className="font-display text-lg font-bold uppercase tracking-wide text-white">
          Program Minggu {weekNumber}
        </span>
        <div className="flex gap-2">
          <Button onClick={handleCopy} className="px-3 py-1.5 text-xs">
            {copied ? "✅ Tersalin!" : "📋 Salin Program"}
          </Button>
          <Button variant="secondary" onClick={onEdit} className="px-3 py-1.5 text-xs">
            ✏️ Edit Lagi
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-5">
        {days.length === 0 && <p className="text-sm text-muted">Belum ada hari di minggu ini.</p>}
        {days.map((day, dayIndex) => {
          const slots = day.slots.filter((s) => s.movementId);
          return (
            <div key={dayIndex}>
              <p className="font-display text-base font-bold uppercase tracking-wide text-accent">
                {day.dayLabel || "(tanpa nama)"}
                {day.focusLabel && <span className="text-foreground"> &mdash; {day.focusLabel}</span>}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {slots.length === 0 && <p className="text-sm text-muted">Belum ada gerakan.</p>}
                {slots.map((slot, slotIndex) => {
                  const movement = movementById.get(slot.movementId);
                  const setsReps = [slot.sets, slot.repTarget].filter(Boolean).join("x");
                  return (
                    <p key={slotIndex} className="text-sm">
                      {slot.slotLabel.trim() && <span className="font-semibold">{slot.slotLabel.trim()}. </span>}
                      <span>{movement?.name ?? "(gerakan tidak ditemukan)"}</span>
                      {setsReps && <span className="text-muted"> &mdash; {setsReps}</span>}
                      {slot.targetWeight && <span className="text-muted"> @{slot.targetWeight}kg</span>}
                      {slot.note.trim() && <span className="italic text-muted"> ({slot.note.trim()})</span>}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
