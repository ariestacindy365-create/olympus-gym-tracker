"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Dot } from "recharts";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";

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
}

export function ProgressView({ exercises, referenceDate }: ProgressViewProps) {
  const defaultExerciseId = useMemo(() => {
    if (exercises.length === 0) return "";
    let best = exercises[0];
    for (const ex of exercises) {
      const exLast = ex.sessions.at(-1)?.workoutDate ?? "";
      const bestLast = best.sessions.at(-1)?.workoutDate ?? "";
      if (exLast > bestLast) best = ex;
    }
    return best.exerciseId;
  }, [exercises]);

  const [selectedId, setSelectedId] = useState(defaultExerciseId);
  const current = exercises.find((e) => e.exerciseId === selectedId) ?? exercises[0] ?? null;

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
          {exercises.map((ex) => (
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-3">Tanggal</th>
                <th className="pb-2 pr-3">Set</th>
                <th className="pb-2 pr-3">Beban</th>
                <th className="pb-2 pr-3">Rep</th>
                <th className="pb-2">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((s) => (
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
                  <td className="py-2 text-muted">{s.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
