"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Dot } from "recharts";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { parseWeightInput } from "@/lib/parseWeight";

export interface ProgressSession {
  id: string;
  workoutDate: string;
  setNumber: number;
  weight: number;
  reps: number;
  note: string | null;
  isPR: boolean;
}

export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  sessions: ProgressSession[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

interface ProgressViewProps {
  exercises: ExerciseProgress[];
  /** ISO timestamp for "now", passed in from the server so the component stays pure. */
  referenceDate: string;
  /** Lets the viewer delete a session from history (member's own dashboard, or a coach on a member's page). */
  canDelete?: boolean;
  /** Lets the viewer edit a session's weight/reps (coach fixing a bad entry, e.g. phone comma-decimal trouble). */
  canEdit?: boolean;
  /** API base to hit for edit/delete, e.g. "/api/member/sets" or "/api/coach/members/{id}/sets". */
  basePath?: string;
}

export function ProgressView({
  exercises,
  referenceDate,
  canDelete = false,
  canEdit = false,
  basePath = "/api/member/sets",
}: ProgressViewProps) {
  const [data, setData] = useState(exercises);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");

  const defaultExerciseId = useMemo(() => {
    if (data.length === 0) return "";
    let best = data[0];
    for (const ex of data) {
      const exLast = ex.sessions.at(-1)?.workoutDate ?? "";
      const bestLast = best.sessions.at(-1)?.workoutDate ?? "";
      if (exLast > bestLast) best = ex;
    }
    return best.exerciseId;
  }, [data]);

  const [selectedId, setSelectedId] = useState(defaultExerciseId);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const current = data.find((e) => e.exerciseId === selectedId) ?? data[0] ?? null;

  function applySessions(exerciseId: string, rawSessions: unknown[]) {
    const sessions: ProgressSession[] = (
      rawSessions as { id: string; workoutDate: string; setNumber: number; weight: number; reps: number; note: string | null; isPR: boolean }[]
    ).map((s) => ({
      id: s.id,
      workoutDate: s.workoutDate,
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      note: s.note,
      isPR: s.isPR,
    }));
    setData((prev) => prev.map((ex) => (ex.exerciseId === exerciseId ? { ...ex, sessions } : ex)));
  }

  async function handleDelete(setId: string, exerciseId: string) {
    if (!confirm("Hapus sesi ini? Rekor akan dihitung ulang.")) return;
    setPendingId(setId);
    setDeleteError(null);
    try {
      const res = await fetch(`${basePath}/${setId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        setDeleteError(body.error ?? "Gagal menghapus sesi.");
        return;
      }
      applySessions(exerciseId, body.allSets ?? body.sets);
    } catch {
      setDeleteError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPendingId(null);
    }
  }

  function startEdit(s: ProgressSession) {
    setEditingId(s.id);
    setEditWeight(String(s.weight));
    setEditReps(String(s.reps));
    setDeleteError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(setId: string, exerciseId: string) {
    const weightNum = parseWeightInput(editWeight);
    const repsNum = Number(editReps);
    if (!weightNum || !repsNum || repsNum <= 0) {
      setDeleteError("Isi beban dan reps yang valid.");
      return;
    }

    setPendingId(setId);
    setDeleteError(null);
    try {
      const res = await fetch(`${basePath}/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: weightNum, reps: repsNum }),
      });
      const body = await res.json();
      if (!res.ok) {
        setDeleteError(body.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      applySessions(exerciseId, body.allSets ?? body.sets);
      setEditingId(null);
    } catch {
      setDeleteError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPendingId(null);
    }
  }

  if (!current) {
    return (
      <Card>
        <p className="text-sm text-muted">Belum ada data progress.</p>
      </Card>
    );
  }

  const sessions = current.sessions;
  const totalSessions = new Set(sessions.map((s) => new Date(s.workoutDate).toDateString())).size;
  const maxWeight = Math.max(...sessions.map((s) => s.weight));
  const lastWeight = sessions.at(-1)?.weight ?? 0;

  const sevenDaysAgo = new Date(referenceDate).getTime() - 7 * 24 * 60 * 60 * 1000;
  const recentWeights = sessions
    .filter((s) => new Date(s.workoutDate).getTime() >= sevenDaysAgo)
    .map((s) => s.weight);
  const pr7d = recentWeights.length > 0 ? Math.max(...recentWeights) : null;

  // Multiple sets can share a day now — only append the set number to the
  // chart label when a day actually has more than one, so single-set days
  // stay clean.
  const dateOccurrences = new Map<string, number>();
  for (const s of sessions) {
    const d = formatDate(s.workoutDate);
    dateOccurrences.set(d, (dateOccurrences.get(d) ?? 0) + 1);
  }
  const chartData = sessions.map((s) => {
    const d = formatDate(s.workoutDate);
    const label = (dateOccurrences.get(d) ?? 0) > 1 ? `${d} S${s.setNumber}` : d;
    return { date: label, weight: s.weight };
  });
  const lastIndex = chartData.length - 1;

  const tableRows = [...sessions].reverse();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Gerakan</label>
        <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {data.map((ex) => (
            <option key={ex.exerciseId} value={ex.exerciseId}>
              {ex.exerciseName}
            </option>
          ))}
        </Select>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <StatTile label="Total Sesi" value={totalSessions} accent />
        <StatTile label="Beban Maks" value={`${maxWeight}kg`} />
        <StatTile label="Beban Terakhir" value={`${lastWeight}kg`} />
        <StatTile label="PR 7 Hari" value={pr7d != null ? `${pr7d}kg` : "-"} />
      </div>

      <Card>
        <h3 className="mb-3 font-display text-lg font-semibold">
          {current.exerciseName} ({totalSessions} sesi)
        </h3>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} unit="kg" />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                  const isLast = props.index === lastIndex;
                  return (
                    <Dot
                      key={`dot-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={isLast ? 6 : 4}
                      fill={isLast ? "var(--danger)" : "var(--accent)"}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-display text-lg font-semibold">Riwayat Sesi</h3>
        {deleteError && <p className="mb-2 text-sm text-danger">{deleteError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-3">Tanggal</th>
                <th className="pb-2 pr-3">Set</th>
                <th className="pb-2 pr-3">Beban</th>
                <th className="pb-2 pr-3">Rep</th>
                <th className="pb-2 pr-3">Catatan</th>
                {(canEdit || canDelete) && <th className="pb-2" />}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((s) =>
                editingId === s.id ? (
                  <tr key={s.id} className="border-b border-border bg-surface-2 last:border-0">
                    <td className="py-2 pr-3">{formatDate(s.workoutDate)}</td>
                    <td className="py-2 pr-3 text-muted">#{s.setNumber}</td>
                    <td className="py-2 pr-3">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        className="!py-1 w-20"
                        placeholder="kg"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={editReps}
                        onChange={(e) => setEditReps(e.target.value)}
                        className="!py-1 w-16"
                        placeholder="reps"
                      />
                    </td>
                    <td className="py-2 pr-3 text-muted">{s.note ?? "—"}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={cancelEdit}>
                          Batal
                        </Button>
                        <Button
                          type="button"
                          className="px-2 py-1 text-xs"
                          disabled={pendingId === s.id}
                          onClick={() => saveEdit(s.id, current.exerciseId)}
                        >
                          {pendingId === s.id ? "..." : "Simpan"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">{formatDate(s.workoutDate)}</td>
                    <td className="py-2 pr-3 text-muted">#{s.setNumber}</td>
                    <td className="py-2 pr-3">
                      {s.weight}kg{" "}
                      {s.isPR && (
                        <Badge tone="accent" className="ml-1">
                          PR
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone="muted">{s.reps} rep</Badge>
                    </td>
                    <td className="py-2 pr-3 text-muted">{s.note ?? "—"}</td>
                    {(canEdit || canDelete) && (
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => startEdit(s)}
                              disabled={pendingId === s.id}
                              aria-label="Edit sesi"
                              className="text-muted hover:text-foreground disabled:opacity-50"
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(s.id, current.exerciseId)}
                              disabled={pendingId === s.id}
                              aria-label="Hapus sesi"
                              className="text-muted hover:text-danger disabled:opacity-50"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
