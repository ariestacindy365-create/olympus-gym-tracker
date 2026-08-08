"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MovementCombobox, type MovementOption } from "@/components/coach/MovementCombobox";

export interface SlotState {
  id: string;
  slotLabel: string;
  movementId: string;
  sets: string;
  repTarget: string;
  targetWeight: string;
  note: string;
  roundScheme: string;
}

interface SortableSlotRowProps {
  slot: SlotState;
  striped: boolean;
  movements: MovementOption[];
  /** True for the first slot in its round (e.g. "A1") — only that slot's roundScheme is read when rendering a slide. */
  isRoundStart: boolean;
  onChange: (patch: Partial<SlotState>) => void;
  onRemove: () => void;
  onMovementCreated: (movement: MovementOption) => void;
}

function cellInputClass(extra = "") {
  return `w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface-2 focus:outline-none ${extra}`;
}

export function SortableSlotRow({
  slot,
  striped,
  movements,
  isRoundStart,
  onChange,
  onRemove,
  onMovementCreated,
}: SortableSlotRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${striped ? "bg-surface" : "bg-surface-2/40"} ${isDragging ? "relative z-10 bg-surface-2 shadow-lg" : ""}`}
    >
      <td className="border-b border-border px-1 py-1 align-top">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab touch-none rounded px-1 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground active:cursor-grabbing"
            aria-label="Geser urutan"
          >
            ⠿
          </button>
          <div className="flex min-w-0 flex-col gap-0.5">
            <input
              placeholder="-"
              value={slot.slotLabel}
              onChange={(e) => onChange({ slotLabel: e.target.value })}
              className={cellInputClass("font-semibold text-muted")}
            />
            {isRoundStart && (
              <input
                placeholder="Skema (E3MOM, dst)"
                value={slot.roundScheme}
                onChange={(e) => onChange({ roundScheme: e.target.value })}
                className={cellInputClass("text-xs")}
              />
            )}
          </div>
        </div>
      </td>
      <td className="border-b border-border px-2 py-1 align-top">
        <MovementCombobox
          movements={movements}
          value={slot.movementId}
          onChange={(movementId) => onChange({ movementId })}
          onMovementCreated={onMovementCreated}
        />
      </td>
      <td className="border-b border-border px-2 py-1 align-top">
        <input
          type="number"
          placeholder="-"
          value={slot.sets}
          onChange={(e) => onChange({ sets: e.target.value })}
          className={cellInputClass()}
        />
      </td>
      <td className="border-b border-border px-2 py-1 align-top">
        <input
          placeholder="-"
          value={slot.repTarget}
          onChange={(e) => onChange({ repTarget: e.target.value })}
          className={cellInputClass()}
        />
      </td>
      <td className="border-b border-border px-2 py-1 align-top">
        <input
          type="number"
          placeholder="-"
          value={slot.targetWeight}
          onChange={(e) => onChange({ targetWeight: e.target.value })}
          className={cellInputClass()}
        />
      </td>
      <td className="border-b border-border px-2 py-1 align-top">
        <input
          placeholder="-"
          value={slot.note}
          onChange={(e) => onChange({ note: e.target.value })}
          className={cellInputClass()}
        />
      </td>
      <td className="border-b border-border px-1 py-1 align-top text-center">
        <button type="button" onClick={onRemove} className="text-muted hover:text-danger" aria-label="Hapus gerakan">
          &#10005;
        </button>
      </td>
    </tr>
  );
}
