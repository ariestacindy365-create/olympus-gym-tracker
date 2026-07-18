"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MovementCombobox, type MovementOption } from "@/components/coach/MovementCombobox";

interface SlotState {
  slotLabel: string;
  movementId: string;
  sets: string;
  repTarget: string;
  note: string;
}

interface DayState {
  dayLabel: string;
  focusLabel: string;
  slots: SlotState[];
}

interface ProgramEditorProps {
  memberId: string;
  movements: MovementOption[];
  initialWeeks: Record<number, DayState[]>;
}

const WEEKS = [1, 2, 3, 4];

function emptyDay(): DayState {
  return { dayLabel: "", focusLabel: "", slots: [] };
}

function emptySlot(): SlotState {
  return { slotLabel: "", movementId: "", sets: "", repTarget: "", note: "" };
}

export function ProgramEditor({ memberId, movements, initialWeeks }: ProgramEditorProps) {
  const [weeks, setWeeks] = useState(initialWeeks);
  const [activeWeek, setActiveWeek] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const days = weeks[activeWeek] ?? [];

  function updateDays(next: DayState[]) {
    setWeeks((prev) => ({ ...prev, [activeWeek]: next }));
    setSaved(false);
  }

  function addDay() {
    updateDays([...days, emptyDay()]);
  }

  function removeDay(dayIndex: number) {
    if (!confirm("Hapus hari ini beserta semua gerakannya?")) return;
    updateDays(days.filter((_, i) => i !== dayIndex));
  }

  function updateDay(dayIndex: number, patch: Partial<DayState>) {
    updateDays(days.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d)));
  }

  function addSlot(dayIndex: number) {
    updateDay(dayIndex, { slots: [...days[dayIndex].slots, emptySlot()] });
  }

  function removeSlot(dayIndex: number, slotIndex: number) {
    updateDay(dayIndex, { slots: days[dayIndex].slots.filter((_, i) => i !== slotIndex) });
  }

  function updateSlot(dayIndex: number, slotIndex: number, patch: Partial<SlotState>) {
    const nextSlots = days[dayIndex].slots.map((s, i) => (i === slotIndex ? { ...s, ...patch } : s));
    updateDay(dayIndex, { slots: nextSlots });
  }

  async function handleSave() {
    setError(null);
    setSaved(false);

    const emptyDayLabel = days.find((d) => !d.dayLabel.trim());
    if (emptyDayLabel) {
      setError("Isi nama hari untuk semua hari yang ditambahkan.");
      return;
    }

    const payload = {
      days: days.map((d) => ({
        dayLabel: d.dayLabel.trim(),
        focusLabel: d.focusLabel.trim() || undefined,
        slots: d.slots
          .filter((s) => s.movementId)
          .map((s) => ({
            slotLabel: s.slotLabel.trim() || undefined,
            movementId: s.movementId,
            sets: s.sets ? Number(s.sets) : undefined,
            repTarget: s.repTarget.trim() || undefined,
            note: s.note.trim() || undefined,
          })),
      })),
    };

    setPending(true);
    try {
      const res = await fetch(`/api/coach/programs/${memberId}/${activeWeek}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan program.");
        return;
      }
      interface SavedSlot {
        slotLabel: string | null;
        movementId: string;
        sets: number | null;
        repTarget: string | null;
        note: string | null;
      }
      interface SavedDay {
        dayLabel: string;
        focusLabel: string | null;
        slots: SavedSlot[];
      }
      const mapped: DayState[] = (data.days as SavedDay[]).map((d) => ({
        dayLabel: d.dayLabel,
        focusLabel: d.focusLabel ?? "",
        slots: d.slots.map((s) => ({
          slotLabel: s.slotLabel ?? "",
          movementId: s.movementId,
          sets: s.sets != null ? String(s.sets) : "",
          repTarget: s.repTarget ?? "",
          note: s.note ?? "",
        })),
      }));
      setWeeks((prev) => ({ ...prev, [activeWeek]: mapped }));
      setSaved(true);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {WEEKS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setActiveWeek(w)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              activeWeek === w ? "bg-accent text-background" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            Minggu {w}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day, dayIndex) => (
          <Card key={dayIndex}>
            <div className="mb-3 flex items-center gap-2">
              <Input
                placeholder="Hari (mis. SENIN)"
                value={day.dayLabel}
                onChange={(e) => updateDay(dayIndex, { dayLabel: e.target.value.toUpperCase() })}
                className="max-w-[140px]"
              />
              <Input
                placeholder="Fokus (mis. UPPER PUSH)"
                value={day.focusLabel}
                onChange={(e) => updateDay(dayIndex, { focusLabel: e.target.value })}
              />
              <Button variant="danger" className="whitespace-nowrap px-3 py-2 text-xs" onClick={() => removeDay(dayIndex)}>
                Hapus Hari
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {day.slots.map((slot, slotIndex) => (
                <div key={slotIndex} className="grid grid-cols-[60px_1fr_60px_100px_1fr_auto] items-start gap-2">
                  <Input
                    placeholder="Slot"
                    value={slot.slotLabel}
                    onChange={(e) => updateSlot(dayIndex, slotIndex, { slotLabel: e.target.value })}
                  />
                  <MovementCombobox
                    movements={movements}
                    value={slot.movementId}
                    onChange={(movementId) => updateSlot(dayIndex, slotIndex, { movementId })}
                  />
                  <Input
                    type="number"
                    placeholder="Set"
                    value={slot.sets}
                    onChange={(e) => updateSlot(dayIndex, slotIndex, { sets: e.target.value })}
                  />
                  <Input
                    placeholder="Rep"
                    value={slot.repTarget}
                    onChange={(e) => updateSlot(dayIndex, slotIndex, { repTarget: e.target.value })}
                  />
                  <Input
                    placeholder="Catatan"
                    value={slot.note}
                    onChange={(e) => updateSlot(dayIndex, slotIndex, { note: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    className="px-2 py-2 text-xs text-danger"
                    onClick={() => removeSlot(dayIndex, slotIndex)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="secondary" className="mt-3 px-3 py-1.5 text-xs" onClick={() => addSlot(dayIndex)}>
              + Tambah Gerakan
            </Button>
          </Card>
        ))}
      </div>

      <Button variant="secondary" onClick={addDay} className="self-start">
        + Tambah Hari
      </Button>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-accent">Program Minggu {activeWeek} tersimpan.</p>}

      <Button onClick={handleSave} disabled={pending} className="self-start px-6">
        {pending ? "Menyimpan..." : `Simpan Minggu ${activeWeek}`}
      </Button>
    </div>
  );
}
