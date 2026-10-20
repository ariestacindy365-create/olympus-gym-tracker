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
import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { PRShareButton } from "@/components/member/PRShareButton";
import { PRCelebrationModal, type PRCelebrationData } from "@/components/member/PRCelebrationModal";
import { epley1RM } from "@/lib/oneRepMax";
import { VolumeStoryModal } from "@/components/member/VolumeStoryModal";
import { ProgressStoryModal } from "@/components/member/ProgressStoryModal";
import { bestE1RMByDay, progressDelta, type ProgressStoryData } from "@/lib/progressStory";
import { formatKg, totalVolume, type LifterCharacter, type SkinTone, type VolumeStoryData } from "@/lib/volumeStory";

type ChartMode = "weight" | "e1rm" | "volume";

const CHART_MODES: { id: ChartMode; label: string }[] = [
  { id: "weight", label: "Beban" },
  { id: "e1rm", label: "Estimasi 1RM" },
  { id: "volume", label: "Volume" },
];

const HISTORY_PREVIEW_DAYS = 5;

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
  /** Every set, when `sessions` is collapsed to one row per day. */
  allSessions?: ProgressSession[];
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
  /** Member's own dashboard only: PR badges reopen the shareable PR card under this name. */
  shareMemberName?: string;
  /** Lifter/skin tone for volume cards shared from history (member only). */
  storyCharacter?: LifterCharacter | null;
  storySkinTone?: SkinTone | null;
}

export function ProgressView({
  exercises,
  referenceDate,
  canDelete = false,
  canEdit = false,
  basePath = "/api/member/sets",
  shareMemberName,
  storyCharacter = null,
  storySkinTone = null,
}: ProgressViewProps) {
  const confirmDialog = useConfirm();
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
  const [shareCard, setShareCard] = useState<PRCelebrationData | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("weight");
  const [volumeCard, setVolumeCard] = useState<VolumeStoryData | null>(null);
  const [progressCard, setProgressCard] = useState<ProgressStoryData | null>(null);
  const character = storyCharacter;
  const skinTone = storySkinTone;
  const [showAllDays, setShowAllDays] = useState(false);
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
    setData((prev) => prev.map((ex) => (ex.exerciseId === exerciseId ? { ...ex, sessions, allSessions: undefined } : ex)));
  }

  async function handleDelete(setId: string, exerciseId: string) {
    const ok = await confirmDialog({ description: "Hapus sesi ini? Rekor akan dihitung ulang.", confirmLabel: "Hapus", danger: true });
    if (!ok) return;
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
  const everySet = current.allSessions ?? sessions;
  const e1rmPoints = bestE1RMByDay(everySet);
  const delta = progressDelta(e1rmPoints);

  // One entry per training day, newest first — for the chart's volume mode
  // and the "share a past session" list.
  const dayMap = new Map<string, { date: string; sets: { weight: number; reps: number }[] }>();
  for (const s of everySet) {
    const key = s.workoutDate.slice(0, 10);
    const day = dayMap.get(key) ?? { date: s.workoutDate, sets: [] };
    day.sets.push({ weight: s.weight, reps: s.reps });
    dayMap.set(key, day);
  }
  const days = [...dayMap.values()].sort((a, b) => b.date.localeCompare(a.date));

  const chartData =
    chartMode === "weight"
      ? sessions.map((s) => {
          const d = formatDate(s.workoutDate);
          const label = (dateOccurrences.get(d) ?? 0) > 1 ? `${d} S${s.setNumber}` : d;
          return { date: label, value: s.weight };
        })
      : chartMode === "e1rm"
        ? e1rmPoints.map((p) => ({ date: formatDate(p.date), value: p.value }))
        : [...days].reverse().map((d) => ({ date: formatDate(d.date), value: totalVolume(d.sets) }));
  const chartLabel = chartMode === "weight" ? "Beban" : chartMode === "e1rm" ? "Estimasi 1RM" : "Volume";
  const lastIndex = chartData.length - 1;
  const visibleDays = showAllDays ? days : days.slice(0, HISTORY_PREVIEW_DAYS);

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

      {e1rmPoints.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Progres {current.exerciseName}</p>
            <p className="font-display text-xl font-bold text-accent">
              {delta > 0 ? `Estimasi 1RM naik +${formatKg(delta)} kg` : "Estimasi 1RM masih stabil"}
            </p>
            <p className="text-xs text-muted">
              {formatKg(e1rmPoints[0].value)} kg ({formatDate(e1rmPoints[0].date)}) → terbaik{" "}
              {formatKg(Math.max(...e1rmPoints.map((p) => p.value)))} kg
            </p>
          </div>
          {shareMemberName && (
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-2 text-xs"
              onClick={() =>
                setProgressCard({
                  memberName: shareMemberName,
                  exerciseName: current.exerciseName,
                  points: e1rmPoints,
                  sessions: totalSessions,
                  maxWeight,
                })
              }
            >
              📈 Bagikan progres
            </Button>
          )}
        </div>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">
            {current.exerciseName} ({totalSessions} sesi)
          </h3>
          <div role="tablist" aria-label="Jenis grafik" className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold">
            {CHART_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={chartMode === m.id}
                onClick={() => setChartMode(m.id)}
                className={`rounded-md px-2.5 py-1.5 transition ${
                  chartMode === m.id ? "bg-surface text-foreground shadow-card" : "text-muted hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} unit="kg" />
              <Tooltip
                formatter={(v) => [`${formatKg(Number(v))} kg`, chartLabel]}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Line
                type="monotone"
                dataKey="value"
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

      {shareMemberName && days.length > 0 && (
        <Card>
          <h3 className="font-display text-lg font-semibold">Bagikan Volume Sesi</h3>
          <p className="mb-3 text-xs text-muted">Kartu volume untuk hari latihan mana pun, bukan hanya hari ini.</p>
          <ul className="flex flex-col gap-2">
            {visibleDays.map((d) => (
              <li
                key={d.date}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium">{formatDate(d.date)}</span>
                  <span className="block text-xs text-muted">
                    {d.sets.length} set · {formatKg(totalVolume(d.sets))} kg
                  </span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0 px-3 py-1.5 text-xs"
                  onClick={() =>
                    setVolumeCard({
                      memberName: shareMemberName,
                      exerciseName: current.exerciseName,
                      sets: d.sets,
                      date: d.date,
                    })
                  }
                >
                  🎉 Bagikan
                </Button>
              </li>
            ))}
          </ul>
          {days.length > HISTORY_PREVIEW_DAYS && (
            <button
              type="button"
              onClick={() => setShowAllDays((v) => !v)}
              className="mt-2 text-xs font-semibold text-accent hover:underline"
            >
              {showAllDays ? "Tampilkan lebih sedikit" : `Lihat semua (${days.length} hari)`}
            </button>
          )}
        </Card>
      )}

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
                      {s.isPR &&
                        (shareMemberName ? (
                          <span className="ml-1 inline-block">
                            <PRShareButton
                              onClick={() =>
                                setShareCard({
                                  memberName: shareMemberName,
                                  exerciseName: current.exerciseName,
                                  weight: s.weight,
                                  reps: s.reps,
                                  estimated1RM: epley1RM(s.weight, s.reps),
                                  // sessions are oldest-first; the very first one was the debut.
                                  isDebut: sessions[0]?.id === s.id,
                                  date: s.workoutDate,
                                })
                              }
                            />
                          </span>
                        ) : (
                          <Badge tone="accent" className="ml-1">
                            PR
                          </Badge>
                        ))}
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
                              className="rounded-md p-1.5 text-base text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                            >
                              <EditIcon />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(s.id, current.exerciseId)}
                              disabled={pendingId === s.id}
                              aria-label="Hapus sesi"
                              className="rounded-md p-1.5 text-base text-muted transition hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                            >
                              <TrashIcon />
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
      {shareCard && <PRCelebrationModal data={shareCard} onClose={() => setShareCard(null)} />}
      {volumeCard && (
        <VolumeStoryModal
          data={volumeCard}
          character={character}
          skinTone={skinTone}
          onClose={() => setVolumeCard(null)}
        />
      )}
      {progressCard && <ProgressStoryModal data={progressCard} onClose={() => setProgressCard(null)} />}
    </div>
  );
}
