"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ExerciseOption {
  id: string;
  name: string;
}

interface ExercisePickerProps {
  exercises: ExerciseOption[];
  value: string;
  onChange: (id: string) => void;
  /** The coach's exercise of the day, pinned on top. */
  coachExerciseId: string | null;
  /** Exercises the member trained before, most recent first. */
  recentIds: string[];
  /** Exercises that already have sets today (shown with a ✓). */
  doneIds: Set<string>;
}

/** Select-like button that opens a searchable bottom sheet of exercises. */
export function ExercisePicker({ exercises, value, onChange, coachExerciseId, recentIds, doneIds }: ExercisePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const current = exercises.find((e) => e.id === value);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byId = new Map(exercises.map((e) => [e.id, e]));
    if (q) {
      return [{ title: "Hasil pencarian", items: exercises.filter((e) => e.name.toLowerCase().includes(q)) }];
    }
    const coach = coachExerciseId ? byId.get(coachExerciseId) : undefined;
    const recent = recentIds
      .filter((id) => id !== coachExerciseId)
      .map((id) => byId.get(id))
      .filter((e): e is ExerciseOption => !!e)
      .slice(0, 5);
    return [
      ...(coach ? [{ title: "Dari pelatih hari ini", items: [coach] }] : []),
      ...(recent.length ? [{ title: "Terakhir kamu latih", items: recent }] : []),
      { title: "Semua gerakan", items: exercises },
    ];
  }, [query, exercises, coachExerciseId, recentIds]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium text-foreground shadow-card transition hover:border-border-strong"
      >
        <span className="truncate">{current?.name ?? "Pilih gerakan"}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-muted">
          {doneIds.has(value) && <span className="text-success">✓</span>}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in sm:items-center sm:p-4">
          <button type="button" aria-label="Tutup" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pilih gerakan"
            className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface shadow-overlay animate-sheet-up sm:rounded-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border p-3">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari gerakan..."
                className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-2 pb-4">
              {sections.map((sec) => (
                <div key={sec.title}>
                  <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{sec.title}</p>
                  {sec.items.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-muted">Tidak ada gerakan yang cocok.</p>
                  ) : (
                    sec.items.map((e) => (
                      <button
                        key={`${sec.title}-${e.id}`}
                        type="button"
                        onClick={() => pick(e.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          e.id === value ? "bg-accent font-semibold text-white" : "hover:bg-surface-2"
                        }`}
                      >
                        <span className="truncate">{e.name}</span>
                        {doneIds.has(e.id) && (
                          <span className={e.id === value ? "text-white" : "text-success"} aria-label="sudah ada set hari ini">
                            ✓
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
