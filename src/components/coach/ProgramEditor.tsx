"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MovementCombobox, type MovementOption } from "@/components/coach/MovementCombobox";

interface SlotState {
  slotLabel: string;
  movementId: string;
  sets: string;
  repTarget: string;
  targetWeight: string;
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

const DAY_COLORS = ["#1e3a5f", "#7c2d12", "#065f46", "#4c1d95", "#7f1d1d", "#134e4a"];

function emptyDay(): DayState {
  return { dayLabel: "", focusLabel: "", slots: [] };
}

function emptySlot(): SlotState {
  return { slotLabel: "", movementId: "", sets: "", repTarget: "", targetWeight: "", note: "" };
}

function headerInputClass(extra = "") {
  return `w-full min-w-0 border-none bg-transparent px-1 py-0.5 font-display font-bold uppercase tracking-wide text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/40 ${extra}`;
}

function cellInputClass(extra = "") {
  return `w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface-2 focus:outline-none ${extra}`;
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
            targetWeight: s.targetWeight ? Number(s.targetWeight) : undefined,
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
        targetWeight: number | null;
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
          targetWeight: s.targetWeight != null ? String(s.targetWeight) : "",
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

      <Card className="p-0">
        <div className="rounded-t-lg bg-[#0f172a] px-4 py-3 text-center font-display text-lg font-bold uppercase tracking-wide text-white">
          Jadwal Latihan &mdash; Minggu {activeWeek}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="w-16 px-3 py-2">Slot</th>
                <th className="px-3 py-2">Nama Gerakan</th>
                <th className="w-16 px-3 py-2">Set</th>
                <th className="w-24 px-3 py-2">Rep Target</th>
                <th className="w-24 px-3 py-2">Beban (kg)</th>
                <th className="px-3 py-2">Catatan</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            {days.map((day, dayIndex) => (
              <tbody key={dayIndex}>
                <tr>
                  <td colSpan={7} className="p-0" style={{ background: DAY_COLORS[dayIndex % DAY_COLORS.length] }}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input
                        placeholder="HARI"
                        value={day.dayLabel}
                        onChange={(e) => updateDay(dayIndex, { dayLabel: e.target.value.toUpperCase() })}
                        className={headerInputClass("max-w-[110px] shrink-0")}
                      />
                      <span className="text-white/60">&middot;</span>
                      <input
                        placeholder="FOKUS"
                        value={day.focusLabel}
                        onChange={(e) => updateDay(dayIndex, { focusLabel: e.target.value })}
                        className={headerInputClass("flex-1")}
                      />
                      <button
                        type="button"
                        onClick={() => removeDay(dayIndex)}
                        className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                      >
                        Hapus Hari
                      </button>
                    </div>
                  </td>
                </tr>
                {day.slots.map((slot, slotIndex) => (
                  <tr key={slotIndex} className={slotIndex % 2 === 0 ? "bg-surface" : "bg-surface-2/40"}>
                    <td className="border-b border-border px-2 py-1 align-top">
                      <input
                        placeholder="-"
                        value={slot.slotLabel}
                        onChange={(e) => updateSlot(dayIndex, slotIndex, { slotLabel: e.target.value })}
                        className={cellInputClass("font-semibold text-muted")}
                      />
                    </td>
                    <td className="border-b border-border px-2 py-1 align-top">
                      <MovementCombobox
                        movements={movements}
                        value={slot.movementId}
                        onChange={(movementId) => updateSlot(dayIndex, slotIndex, { movementId })}
                      />
                    </td>
                    <td className="border-b border-border px-2 py-1 align-top">
                      <input
                        type="number"
                        placeholder="-"
                        value={slot.sets}
                        onChange={(e) => updateSlot(dayIndex, slotIndex, { sets: e.target.value })}
                        className={cellInputClass()}
                      />
                    </td>
                    <td className="border-b border-border px-2 py-1 align-top">
                      <input
                        placeholder="-"
                        value={slot.repTarget}
                        onChange={(e) => updateSlot(dayIndex, slotIndex, { repTarget: e.target.value })}
                        className={cellInputClass()}
                      />
                    </td>
                    <td className="border-b border-border px-2 py-1 align-top">
                      <input
                        type="number"
                        placeholder="-"
                        value={slot.targetWeight}
                        onChange={(e) => updateSlot(dayIndex, slotIndex, { targetWeight: e.target.value })}
                        className={cellInputClass()}
                      />
                    </td>
                    <td className="border-b border-border px-2 py-1 align-top">
                      <input
                        placeholder="-"
                        value={slot.note}
                        onChange={(e) => updateSlot(dayIndex, slotIndex, { note: e.target.value })}
                        className={cellInputClass()}
                      />
                    </td>
                    <td className="border-b border-border px-1 py-1 align-top text-center">
                      <button
                        type="button"
                        onClick={() => removeSlot(dayIndex, slotIndex)}
                        className="text-muted hover:text-danger"
                        aria-label="Hapus gerakan"
                      >
                        &#10005;
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="border-b border-border bg-surface px-3 py-2">
                    <button
                      type="button"
                      onClick={() => addSlot(dayIndex)}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      + Tambah Gerakan
                    </button>
                  </td>
                </tr>
              </tbody>
            ))}
          </table>
        </div>

        <div className="px-3 py-3">
          <Button variant="secondary" onClick={addDay} className="px-4 py-1.5 text-xs">
            + Tambah Hari
          </Button>
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-accent">Program Minggu {activeWeek} tersimpan.</p>}

      <Button onClick={handleSave} disabled={pending} className="self-start px-6">
        {pending ? "Menyimpan..." : `Simpan Minggu ${activeWeek}`}
      </Button>
    </div>
  );
}
