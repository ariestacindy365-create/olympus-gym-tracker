"use client";

import { useState } from "react";
import { parseLiftWeight } from "@/lib/parseWeight";
import { UNIT_LABEL } from "@/lib/setUnits";
import type { PlanRound } from "@/lib/todayPlan";
import type { PreviousNote } from "@/lib/ptPrevious";

export interface LoggerSet {
  memberId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  isPR: boolean;
}

interface Cell {
  w: string;
  r: string;
  saved: LoggerSet | null;
  pending: boolean;
}

const key = (memberId: string, exerciseId: string, setNumber: number) => `${memberId}|${exerciseId}|${setNumber}`;

/** One screen for the whole PT session: each movement's set rows, a kg × reps column per person. */
export function PtSessionLogger({
  sessionId,
  members,
  rounds,
  saved,
  previous = {},
}: {
  sessionId: string;
  members: { id: string; name: string }[];
  rounds: PlanRound[];
  saved: LoggerSet[];
  /** Last time each client did each movement, keyed "memberId|exerciseId". */
  previous?: Record<string, PreviousNote>;
}) {
  const [cells, setCells] = useState<Record<string, Cell>>(() => {
    const out: Record<string, Cell> = {};
    for (const s of saved) out[key(s.memberId, s.exerciseId, s.setNumber)] = { w: String(s.weight), r: String(s.reps), saved: s, pending: false };
    return out;
  });
  const [extra, setExtra] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const cell = (k: string): Cell => cells[k] ?? { w: "", r: "", saved: null, pending: false };
  const put = (k: string, change: Partial<Cell>) => setCells((c) => ({ ...c, [k]: { ...cell(k), ...c[k], ...change } }));

  async function save(memberId: string, item: PlanRound["items"][number], setNumber: number) {
    const k = key(memberId, item.exerciseId, setNumber);
    const c = cell(k);
    // An empty kg is 0 only for a no-weight move; a loaded lift needs its weight.
    const weight = !c.w.trim() ? (item.noWeight ? 0 : null) : parseLiftWeight(c.w);
    const reps = Number(c.r || item.repDefault || 0);
    if (weight === null || !Number.isInteger(reps) || reps <= 0) {
      setError(weight === null && !c.w.trim() ? `Isi beban ${item.name} dulu.` : "Isi beban dan jumlah yang valid.");
      return;
    }
    setError(null);
    put(k, { pending: true });
    try {
      const res = await fetch(`/api/coach/members/${memberId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: item.exerciseId, weight, reps, unit: item.unit, perSide: item.perSide, setNumber, ptSessionId: sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan set.");
        put(k, { pending: false });
        return;
      }
      put(k, { pending: false, w: String(weight), r: String(reps), saved: { memberId, exerciseId: item.exerciseId, setNumber, weight, reps, isPR: data.setEntry?.isPR ?? false } });
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
      put(k, { pending: false });
    }
  }

  const doneCount = Object.values(cells).filter((c) => c.saved).length;

  return (
    <div className="flex flex-col gap-3">
      {rounds.map((round) => (
        <div key={round.number} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex items-baseline justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
            <span className="font-display text-lg font-bold">Round {round.number}</span>
            {round.schemeLine && <span className="text-xs font-bold uppercase tracking-wide text-accent">{round.schemeLine}</span>}
          </div>
          {round.items.map((item) => {
            const savedRows = Math.max(0, ...members.flatMap((m) => Object.values(cells).filter((c) => c.saved && c.saved.memberId === m.id && c.saved.exerciseId === item.exerciseId).map((c) => c.saved!.setNumber)));
            const rows = Math.max(item.sets, savedRows) + (extra[item.exerciseId] ?? 0);
            return (
              <div key={item.label + item.exerciseId} className="border-b border-border px-4 pb-3 pt-2.5 last:border-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-sm font-bold text-accent">{item.label}</span>
                  <span className="font-semibold">{item.name}</span>
                  {item.target && <span className="text-xs text-muted">· {item.target}</span>}
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[360px] border-separate border-spacing-x-1.5 border-spacing-y-1 text-sm">
                    <thead>
                      <tr className="text-left text-xs font-bold uppercase text-muted">
                        <th className="w-12" />
                        {members.map((m) => (
                          <th key={m.id} className="truncate">{m.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rows }, (_, j) => (
                        <tr key={j}>
                          <td className="text-xs font-bold uppercase text-muted">Set {j + 1}</td>
                          {members.map((m) => {
                            const k = key(m.id, item.exerciseId, j + 1);
                            const c = cell(k);
                            const savedNow = c.saved && c.w === String(c.saved.weight) && c.r === String(c.saved.reps);
                            const field = `h-10 w-full min-w-0 rounded-lg border px-1.5 text-center font-semibold ${savedNow ? "border-transparent bg-success/10" : "border-border bg-surface"}`;
                            return (
                              <td key={m.id}>
                                <div className="grid grid-cols-[1fr_1fr_40px] gap-1">
                                  <input aria-label={`${m.name} ${item.name} set ${j + 1} beban`} inputMode="decimal" placeholder={item.noWeight ? "0" : "kg"} value={c.w} onChange={(e) => put(k, { w: e.target.value })} className={field} />
                                  <input aria-label={`${m.name} ${item.name} set ${j + 1} ${UNIT_LABEL[item.unit]}`} inputMode="numeric" placeholder={item.repDefault != null ? String(item.repDefault) : UNIT_LABEL[item.unit]} value={c.r} onChange={(e) => put(k, { r: e.target.value })} className={field} />
                                  <button type="button" aria-label={`Simpan ${m.name} ${item.name} set ${j + 1}`} disabled={c.pending} onClick={() => save(m.id, item, j + 1)} className={`h-10 rounded-lg font-bold ${savedNow ? "bg-success text-white" : "border border-border bg-surface-2 text-muted"}`}>
                                    {c.pending ? "…" : c.saved?.isPR && savedNow ? "🏆" : "✓"}
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {members.some((m) => previous[`${m.id}|${item.exerciseId}`]) && (
                        <tr>
                          <td />
                          {members.map((m) => {
                            const p = previous[`${m.id}|${item.exerciseId}`];
                            return (
                              <td key={m.id} className="align-top">
                                {p && (
                                  <div className="mt-1 rounded-lg border border-dashed border-border-strong px-2 py-1.5 text-xs leading-snug">
                                    <p className="font-bold uppercase tracking-wide text-muted">{p.label}</p>
                                    {p.sets && <p className="mt-0.5 tabular-nums">{p.sets}</p>}
                                    {p.notes.map((n, x) => (
                                      <p key={x} className="mt-0.5 italic text-muted">“{n}”</p>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={() => setExtra((x) => ({ ...x, [item.exerciseId]: (x[item.exerciseId] ?? 0) + 1 }))} className="mt-1 text-xs font-semibold text-accent hover:underline">
                  + Tambah set
                </button>
              </div>
            );
          })}
        </div>
      ))}
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>{doneCount} set tercatat</span>
        <button type="button" onClick={() => window.location.reload()} className="font-semibold text-accent hover:underline">
          Muat catatan dari HP klien
        </button>
      </div>
    </div>
  );
}
