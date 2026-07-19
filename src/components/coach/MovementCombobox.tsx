"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/Input";

export interface MovementOption {
  id: string;
  name: string;
  category: string | null;
  equipment: string | null;
}

interface MovementComboboxProps {
  movements: MovementOption[];
  value: string;
  onChange: (movementId: string) => void;
  placeholder?: string;
}

export function MovementCombobox({ movements, value, onChange, placeholder }: MovementComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = movements.find((m) => m.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return movements.slice(0, 30);
    return movements.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 30);
  }, [movements, query]);

  function openDropdown() {
    const box = wrapperRef.current?.getBoundingClientRect();
    if (box) setRect({ top: box.bottom, left: box.left, width: box.width });
    setQuery("");
    setOpen(true);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        type="text"
        placeholder={placeholder ?? "Cari gerakan..."}
        value={open ? query : (selected?.name ?? "")}
        onFocus={openDropdown}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open &&
        rect &&
        createPortal(
          <div
            className="fixed z-50 max-h-60 overflow-y-auto rounded-md border border-border bg-surface shadow-lg"
            style={{ top: rect.top + 4, left: rect.left, width: Math.max(rect.width, 220) }}
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted">Tidak ditemukan.</p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span>{m.name}</span>
                  {(m.category || m.equipment) && (
                    <span className="text-xs text-muted">
                      {[m.category, m.equipment].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
