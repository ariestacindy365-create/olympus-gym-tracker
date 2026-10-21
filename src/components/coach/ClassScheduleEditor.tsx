"use client";

import { useState } from "react";

interface ClassScheduleEditorProps {
  weekdays: { weekday: number; label: string }[];
  sessions: { id: string; name: string }[];
  coaches: { id: string; name: string }[];
  /** "weekday|sessionId" → coachId (missing = no class). */
  initial: Record<string, string | null>;
}

const COLORS = ["bg-accent/10 text-accent", "bg-success/10 text-success", "bg-[#f59e0b]/15 text-[#b45309]", "bg-danger/10 text-danger"];

/** Weekday × class-time grid; each cell picks the coach teaching it. Saves on change. */
export function ClassScheduleEditor({ weekdays, sessions, coaches, initial }: ClassScheduleEditorProps) {
  const [cells, setCells] = useState(initial);
  const [status, setStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
  const color = (id: string | null | undefined) => (id ? COLORS[coaches.findIndex((c) => c.id === id) % COLORS.length] : "text-muted");

  async function change(key: string, coachId: string | null) {
    const prev = cells[key] ?? null;
    const [weekday, sessionId] = key.split("|");
    setCells((c) => ({ ...c, [key]: coachId }));
    setStatus((s) => ({ ...s, [key]: "saving" }));
    try {
      const res = await fetch("/api/coach/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekday: Number(weekday), sessionId, coachId }),
      });
      if (!res.ok) throw new Error();
      setStatus((s) => ({ ...s, [key]: "saved" }));
    } catch {
      setCells((c) => ({ ...c, [key]: prev }));
      setStatus((s) => ({ ...s, [key]: "error" }));
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 font-semibold">Jam</th>
            {weekdays.map((d) => (
              <th key={d.weekday} className="px-2 py-2 font-semibold">
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums">{s.name}</td>
              {weekdays.map((d) => {
                const key = `${d.weekday}|${s.id}`;
                const value = cells[key] ?? "";
                return (
                  <td key={key} className="px-1.5 py-1.5">
                    <select
                      value={value}
                      onChange={(e) => change(key, e.target.value || null)}
                      aria-label={`${d.label} ${s.name}`}
                      className={`h-9 w-full rounded-lg border px-1.5 text-[13px] font-semibold focus:border-accent focus:outline-none ${
                        status[key] === "error" ? "border-danger" : "border-transparent"
                      } ${color(value)}`}
                    >
                      <option value="">— Tidak ada kelas</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {Object.values(status).includes("error") && (
        <p className="border-t border-border px-3 py-2 text-xs text-danger">Ada perubahan yang gagal disimpan. Coba pilih lagi.</p>
      )}
    </div>
  );
}
