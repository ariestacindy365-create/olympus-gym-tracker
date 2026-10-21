"use client";

import { useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface CopyProgramButtonProps {
  coaches: { id: string; name: string; weeks: number[] }[];
}

/** Copies another coach's Minggu 1-4 over this coach's own, as a starting point. */
export function CopyProgramButton({ coaches }: CopyProgramButtonProps) {
  const confirmDialog = useConfirm();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy(c: CopyProgramButtonProps["coaches"][number]) {
    const ok = await confirmDialog({
      title: `Salin program ${c.name}?`,
      description: `Minggu ${c.weeks.join(", ")} milikmu akan diganti dengan salinan program ${c.name}. Setelah itu kamu bisa mengeditnya sendiri tanpa mengubah program ${c.name}.`,
      confirmLabel: "Salin",
      danger: true,
    });
    if (!ok) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/programs/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromCoachId: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyalin program.");
      // The editor keeps its own state, so load the copied weeks fresh.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyalin program.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm">
      <span className="text-muted">Mulai dari program coach lain:</span>
      {coaches.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => copy(c)}
          disabled={pending}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-accent hover:border-accent disabled:opacity-60"
        >
          📋 Salin program {c.name}
        </button>
      ))}
      {error && <span className="text-danger">{error}</span>}
    </div>
  );
}
