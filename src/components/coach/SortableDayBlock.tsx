"use client";

import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableSlotRow, type SlotState } from "@/components/coach/SortableSlotRow";
import { type MovementOption } from "@/components/coach/MovementCombobox";
import { computeRoundStarts } from "@/lib/programRounds";

export interface DayState {
  id: string;
  dayLabel: string;
  focusLabel: string;
  slots: SlotState[];
}

interface SortableDayBlockProps {
  day: DayState;
  color: string;
  movements: MovementOption[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChangeDay: (patch: Partial<Pick<DayState, "dayLabel" | "focusLabel">>) => void;
  onRemoveDay: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddSlot: () => void;
  onChangeSlot: (slotIndex: number, patch: Partial<SlotState>) => void;
  onRemoveSlot: (slotIndex: number) => void;
  onMovementCreated: (movement: MovementOption) => void;
}

function headerInputClass(extra = "") {
  return `w-full min-w-0 border-none bg-transparent px-1 py-0.5 font-display font-bold uppercase tracking-wide text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/40 ${extra}`;
}

export function SortableDayBlock({
  day,
  color,
  movements,
  canMoveUp,
  canMoveDown,
  onChangeDay,
  onRemoveDay,
  onMoveUp,
  onMoveDown,
  onAddSlot,
  onChangeSlot,
  onRemoveSlot,
  onMovementCreated,
}: SortableDayBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: day.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const roundStarts = computeRoundStarts(day.slots.map((s) => s.slotLabel));

  return (
    <tbody ref={setNodeRef} style={style} className={isDragging ? "relative z-20" : undefined}>
      <tr>
        <td colSpan={7} className="p-0" style={{ background: color }}>
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="shrink-0 cursor-grab touch-none rounded px-1 py-1.5 text-white/70 hover:bg-white/10 hover:text-white active:cursor-grabbing"
              aria-label="Geser urutan hari"
            >
              ⠿
            </button>
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="rounded px-1 leading-none text-white/70 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Pindah hari ke atas"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="rounded px-1 leading-none text-white/70 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Pindah hari ke bawah"
              >
                ▼
              </button>
            </div>
            <input
              placeholder="HARI"
              value={day.dayLabel}
              onChange={(e) => onChangeDay({ dayLabel: e.target.value.toUpperCase() })}
              className={headerInputClass("max-w-[110px] shrink-0")}
            />
            <span className="text-white/60">&middot;</span>
            <input
              placeholder="FOKUS"
              value={day.focusLabel}
              onChange={(e) => onChangeDay({ focusLabel: e.target.value })}
              className={headerInputClass("flex-1")}
            />
            <button
              type="button"
              onClick={onRemoveDay}
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
            isRoundStart={roundStarts[slotIndex]}
            onChange={(patch) => onChangeSlot(slotIndex, patch)}
            onRemove={() => onRemoveSlot(slotIndex)}
            onMovementCreated={onMovementCreated}
          />
        ))}
      </SortableContext>
      <tr>
        <td colSpan={7} className="border-b border-border bg-surface px-3 py-2">
          <button type="button" onClick={onAddSlot} className="text-xs font-semibold text-accent hover:underline">
            + Tambah Gerakan
          </button>
        </td>
      </tr>
    </tbody>
  );
}
