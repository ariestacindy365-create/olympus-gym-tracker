"use client";

import { useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { type MovementOption } from "@/components/coach/MovementCombobox";
import { SortableSlotRow, type SlotState } from "@/components/coach/SortableSlotRow";

interface DayState {
  dayLabel: string;
  focusLabel: string;
  slots: SlotState[];
}

interface ProgramEditorProps {
  movements: MovementOption[];
  initialWeeks: Record<number, DayState[]>;
}

const WEEKS = [1, 2, 3, 4];

const DAY_COLORS = ["#1e3a5f", "#7c2d12", "#065f46", "#4c1d95", "#7f1d1d", "#134e4a"];

// Weekly volume landmarks per primary muscle group, matching the coach's
// reference (8-16 sets/muscle for a 3x/week program). Only these muscles are
// tracked — sub-categories like "Bahu Depan" or conditioning tags like
// "Kardio" aren't primary hypertrophy targets, so they're excluded.
const MUSCLE_TARGETS: { label: string; emoji: string; min: number; max: number }[] = [
  { label: "Dada", emoji: "💪", min: 8, max: 15 },
  { label: "Bahu", emoji: "💪", min: 8, max: 15 },
  { label: "Trisep", emoji: "💪", min: 8, max: 14 },
  { label: "Paha Depan", emoji: "🦵", min: 9, max: 16 },
  { label: "Glutes", emoji: "🍑", min: 9, max: 16 },
  { label: "Hamstring", emoji: "🦵", min: 8, max: 14 },
  { label: "Punggung Atas", emoji: "🔙", min: 9, max: 16 },
  { label: "Punggung Bawah", emoji: "🔙", min: 6, max: 10 },
  { label: "Bisep", emoji: "💪", min: 8, max: 14 },
  { label: "Betis", emoji: "🦵", min: 8, max: 12 },
  { label: "Core", emoji: "🔲", min: 6, max: 12 },
];

// Kamus Gerakan tags some movements with a regional sub-category instead of
// the parent muscle group used above; roll those into the parent bucket so
// they still count toward its weekly volume.
const MUSCLE_ROLLUP: Record<string, string> = {
  "Bahu Depan": "Bahu",
  "Bahu Samping": "Bahu",
  "Glutes Med": "Glutes",
  "Dada Atas": "Dada",
};

function emptyDay(): DayState {
  return { dayLabel: "", focusLabel: "", slots: [] };
}

function emptySlot(): SlotState {
  return {
    id: crypto.randomUUID(),
    slotLabel: "",
    movementId: "",
    sets: "",
    repTarget: "",
    targetWeight: "",
    note: "",
  };
}

function headerInputClass(extra = "") {
  return `w-full min-w-0 border-none bg-transparent px-1 py-0.5 font-display font-bold uppercase tracking-wide text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/40 ${extra}`;
}

const EMPTY_DAYS: DayState[] = [];

export function ProgramEditor({ movements: initialMovements, initialWeeks }: ProgramEditorProps) {
  const [weeks, setWeeks] = useState(initialWeeks);
  const [movements, setMovements] = useState(initialMovements);
  const [activeWeek, setActiveWeek] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleMovementCreated(movement: MovementOption) {
    setMovements((prev) => [...prev, movement].sort((a, b) => a.name.localeCompare(b.name)));
  }

  const days = weeks[activeWeek] ?? EMPTY_DAYS;

  const movementMuscle = useMemo(
    () => new Map(movements.map((m) => [m.id, m.primaryMuscle])),
    [movements]
  );

  const volumeSummary = useMemo(() => {
    const totals = new Map<string, number>();
    for (const day of days) {
      for (const slot of day.slots) {
        if (!slot.movementId) continue;
        // FINISHER-block conditioning work (unlabeled continuation rows and
        // the "FINISHER" row itself) doesn't count toward muscle volume —
        // only the 6 main lettered slots (A1/A2/B1/B2/C1/C2) do.
        const label = slot.slotLabel.trim().toUpperCase();
        if (!label || label === "FINISHER") continue;
        const rawMuscle = movementMuscle.get(slot.movementId);
        if (!rawMuscle) continue;
        const muscle = MUSCLE_ROLLUP[rawMuscle] ?? rawMuscle;
        const setsNum = Number(slot.sets) || 0;
        totals.set(muscle, (totals.get(muscle) ?? 0) + setsNum);
      }
    }
    return MUSCLE_TARGETS.map((mt) => {
      const total = totals.get(mt.label) ?? 0;
      let status: { text: string; tone: "success" | "danger" | "accent" | "muted" };
      if (total === 0) {
        status = { text: "—", tone: "muted" };
      } else if (total < mt.min) {
        status = { text: `⚠️ Kurang (min ${mt.min} set)`, tone: "danger" };
      } else if (total > mt.max) {
        status = { text: "⚡ Lebih", tone: "accent" };
      } else {
        status = { text: "✅ Oke", tone: "success" };
      }
      return { ...mt, total, status };
    });
  }, [days, movementMuscle]);

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

  function handleSlotDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const dayIndex = days.findIndex((d) => d.slots.some((s) => s.id === active.id));
    if (dayIndex === -1) return;
    const slots = days[dayIndex].slots;
    const oldIndex = slots.findIndex((s) => s.id === active.id);
    const newIndex = slots.findIndex((s) => s.id === over.id);
    // newIndex === -1 means `over` belongs to a different day's list — ignore,
    // slots only reorder within their own day.
    if (oldIndex === -1 || newIndex === -1) return;
    updateDay(dayIndex, { slots: arrayMove(slots, oldIndex, newIndex) });
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
      const res = await fetch(`/api/coach/programs/${activeWeek}`, {
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
        id: string;
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
          id: s.id,
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
          <DndContext
            id="program-slots-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSlotDragEnd}
          >
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="w-24 px-3 py-2">Slot</th>
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
                  <SortableContext items={day.slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    {day.slots.map((slot, slotIndex) => (
                      <SortableSlotRow
                        key={slot.id}
                        slot={slot}
                        striped={slotIndex % 2 === 0}
                        movements={movements}
                        onChange={(patch) => updateSlot(dayIndex, slotIndex, patch)}
                        onRemove={() => removeSlot(dayIndex, slotIndex)}
                        onMovementCreated={handleMovementCreated}
                      />
                    ))}
                  </SortableContext>
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
          </DndContext>
        </div>

        <div className="px-3 py-3">
          <Button variant="secondary" onClick={addDay} className="px-4 py-1.5 text-xs">
            + Tambah Hari
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="rounded-t-lg bg-[#0f172a] px-4 py-3 text-center font-display text-lg font-bold uppercase tracking-wide text-white">
          Rangkuman Volume Otot &mdash; Minggu {activeWeek}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Otot</th>
                <th className="w-24 px-3 py-2">Total Set</th>
                <th className="w-24 px-3 py-2">Target Min</th>
                <th className="w-24 px-3 py-2">Target Maks</th>
                <th className="w-40 px-3 py-2">Status</th>
                <th className="px-3 py-2">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {volumeSummary.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-surface" : "bg-surface-2/40"}>
                  <td className="border-b border-border px-3 py-2 font-medium">
                    {row.emoji} {row.label}
                  </td>
                  <td className="border-b border-border px-3 py-2 font-semibold">{row.total}</td>
                  <td className="border-b border-border px-3 py-2 text-muted">{row.min}</td>
                  <td className="border-b border-border px-3 py-2 text-muted">{row.max}</td>
                  <td className="border-b border-border px-3 py-2">
                    <Badge tone={row.status.tone}>{row.status.text}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-2 text-muted">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="px-4 py-3 text-xs text-muted">
          📊 Hanya otot PRIMER, dari {movements.length} gerakan di Kamus Gerakan. Target volume mingguan mengacu pada
          rekomendasi 8-16 set/otot untuk program 3x/minggu.
        </p>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-accent">Program Minggu {activeWeek} tersimpan.</p>}

      <Button onClick={handleSave} disabled={pending} className="self-start px-6">
        {pending ? "Menyimpan..." : `Simpan Minggu ${activeWeek}`}
      </Button>
    </div>
  );
}
