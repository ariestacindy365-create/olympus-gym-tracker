"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/Input";

export interface MovementOption {
  id: string;
  name: string;
  category: string | null;
  equipment: string | null;
  primaryMuscle: string | null;
}

interface MovementComboboxProps {
  movements: MovementOption[];
  value: string;
  onChange: (movementId: string) => void;
  placeholder?: string;
}

const ALL = "Semua";

function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b));
}

export function MovementCombobox({ movements, value, onChange, placeholder }: MovementComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [muscleFilter, setMuscleFilter] = useState(ALL);
  const [equipmentFilter, setEquipmentFilter] = useState(ALL);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = movements.find((m) => m.id === value) ?? null;

  const categories = useMemo(() => uniqueSorted(movements.map((m) => m.category)), [movements]);
  const muscles = useMemo(() => uniqueSorted(movements.map((m) => m.primaryMuscle)), [movements]);
  const equipmentList = useMemo(() => uniqueSorted(movements.map((m) => m.equipment)), [movements]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movements
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .filter((m) => categoryFilter === ALL || m.category === categoryFilter)
      .filter((m) => muscleFilter === ALL || m.primaryMuscle === muscleFilter)
      .filter((m) => equipmentFilter === ALL || m.equipment === equipmentFilter)
      .slice(0, 40);
  }, [movements, query, categoryFilter, muscleFilter, equipmentFilter]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function openDropdown() {
    const box = wrapperRef.current?.getBoundingClientRect();
    if (box) setRect({ top: box.bottom, left: box.left, width: box.width });
    setQuery("");
    setOpen(true);
  }

  const selectClass =
    "min-w-0 flex-1 rounded border border-border bg-surface-2 px-1.5 py-1 text-xs text-foreground focus:border-accent focus:outline-none";

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        type="text"
        placeholder={placeholder ?? "Cari gerakan..."}
        value={open ? query : (selected?.name ?? "")}
        onFocus={openDropdown}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-50 flex max-h-96 flex-col overflow-hidden rounded-md border border-border bg-surface shadow-lg"
            style={{ top: rect.top + 4, left: rect.left, width: Math.max(rect.width, 340) }}
          >
            <div className="flex flex-wrap gap-1 border-b border-border p-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectClass}
                aria-label="Filter kategori"
              >
                <option value={ALL}>Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={muscleFilter}
                onChange={(e) => setMuscleFilter(e.target.value)}
                className={selectClass}
                aria-label="Filter otot primer"
              >
                <option value={ALL}>Semua Otot</option>
                {muscles.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className={selectClass}
                aria-label="Filter alat"
              >
                <option value={ALL}>Semua Alat</option>
                {equipmentList.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted">Tidak ditemukan.</p>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <span>{m.name}</span>
                    <span className="text-xs text-muted">
                      {[m.category, m.primaryMuscle, m.equipment].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
