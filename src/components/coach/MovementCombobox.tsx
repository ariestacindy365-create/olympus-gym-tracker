"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
  onMovementCreated: (movement: MovementOption) => void;
  placeholder?: string;
}

const ALL = "Semua";
const NEW_OPTION = "__new__";

function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b));
}

const fieldInputClass =
  "min-w-0 flex-1 rounded border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none";

function SelectOrNew({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [customMode, setCustomMode] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted">{label}</label>
      {customMode ? (
        <div className="flex gap-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${label} baru...`}
            className={fieldInputClass}
          />
          <button
            type="button"
            onClick={() => {
              setCustomMode(false);
              onChange("");
            }}
            className="shrink-0 text-xs text-muted hover:text-foreground"
          >
            Batal
          </button>
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === NEW_OPTION) {
              setCustomMode(true);
              onChange("");
            } else {
              onChange(e.target.value);
            }
          }}
          className={fieldInputClass}
        >
          <option value="">Pilih {label.toLowerCase()}...</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value={NEW_OPTION}>+ Baru...</option>
        </select>
      )}
    </div>
  );
}

export function MovementCombobox({
  movements,
  value,
  onChange,
  onMovementCreated,
  placeholder,
}: MovementComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [muscleFilter, setMuscleFilter] = useState(ALL);
  const [equipmentFilter, setEquipmentFilter] = useState(ALL);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newEquipment, setNewEquipment] = useState("");
  const [newRepRange, setNewRepRange] = useState("");
  const [newSetRange, setNewSetRange] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
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
      setAdding(false);
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

  function startAdding() {
    setNewName(query.trim());
    setCreateError(null);
    setAdding(true);
  }

  async function handleCreate() {
    setCreateError(null);
    if (newName.trim().length < 2 || !newMuscle.trim() || !newCategory.trim() || !newEquipment.trim()) {
      setCreateError("Isi nama, otot primer, kategori, dan alat.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/coach/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          primaryMuscle: newMuscle.trim(),
          category: newCategory.trim(),
          equipment: newEquipment.trim(),
          repRangeHint: newRepRange.trim() || undefined,
          setRangeHint: newSetRange.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Gagal menambah gerakan.");
        return;
      }
      onMovementCreated(data.movement);
      onChange(data.movement.id);
      setAdding(false);
      setOpen(false);
      setNewName("");
      setNewMuscle("");
      setNewCategory("");
      setNewEquipment("");
      setNewRepRange("");
      setNewSetRange("");
    } catch {
      setCreateError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setCreating(false);
    }
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
          if (e.key === "Escape") {
            setOpen(false);
            setAdding(false);
          }
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
            {adding ? (
              <div className="flex flex-col gap-2 overflow-y-auto p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Tambah Gerakan Baru</p>
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Batal
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Nama gerakan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={fieldInputClass}
                />
                <SelectOrNew label="Otot Primer" options={muscles} value={newMuscle} onChange={setNewMuscle} />
                <SelectOrNew label="Kategori" options={categories} value={newCategory} onChange={setNewCategory} />
                <SelectOrNew label="Alat" options={equipmentList} value={newEquipment} onChange={setNewEquipment} />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Rep target (opsional, mis. 10-12)"
                    value={newRepRange}
                    onChange={(e) => setNewRepRange(e.target.value)}
                    className={fieldInputClass}
                  />
                  <input
                    type="text"
                    placeholder="Set (opsional, mis. 3)"
                    value={newSetRange}
                    onChange={(e) => setNewSetRange(e.target.value)}
                    className={fieldInputClass}
                  />
                </div>
                {createError && <p className="text-xs text-danger">{createError}</p>}
                <Button type="button" onClick={handleCreate} disabled={creating} className="py-1.5 text-xs">
                  {creating ? "Menyimpan..." : "Simpan Gerakan Baru"}
                </Button>
              </div>
            ) : (
              <>
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

                <button
                  type="button"
                  onClick={startAdding}
                  className="border-t border-border px-3 py-2 text-left text-xs font-semibold text-accent hover:bg-surface-2"
                >
                  + Tambah gerakan baru
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
