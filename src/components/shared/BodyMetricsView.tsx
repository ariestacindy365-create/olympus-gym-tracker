"use client";

import { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { parseWeightInput } from "@/lib/parseWeight";

export interface BodyMetricEntry {
  id: string;
  recordedDate: string;
  weight: number;
  bodyFatPercent: number | null;
  skeletalMuscleMass: number | null;
  note: string | null;
}

interface BodyMetricsViewProps {
  entries: BodyMetricEntry[];
  canEdit?: boolean;
  canDelete?: boolean;
  basePath?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function MiniChart({ data, dataKey, unit, color }: { data: { date: string; value: number }[]; dataKey: string; unit: string; color: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">Belum ada data.</p>;
  }
  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} unit={unit} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Line type="monotone" dataKey="value" name={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BodyMetricsView({ entries, canEdit = false, canDelete = false, basePath = "/api/member/body-metrics" }: BodyMetricsViewProps) {
  const [data, setData] = useState(entries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editBodyFat, setEditBodyFat] = useState("");
  const [editMuscle, setEditMuscle] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...data].sort((a, b) => new Date(a.recordedDate).getTime() - new Date(b.recordedDate).getTime());
  const latest = sorted.at(-1) ?? null;
  const tableRows = [...sorted].reverse();

  const weightChart = sorted.map((e) => ({ date: formatDate(e.recordedDate), value: e.weight }));
  const bodyFatChart = sorted.filter((e) => e.bodyFatPercent != null).map((e) => ({ date: formatDate(e.recordedDate), value: e.bodyFatPercent as number }));
  const muscleChart = sorted
    .filter((e) => e.skeletalMuscleMass != null)
    .map((e) => ({ date: formatDate(e.recordedDate), value: e.skeletalMuscleMass as number }));

  function startEdit(entry: BodyMetricEntry) {
    setEditingId(entry.id);
    setEditWeight(String(entry.weight));
    setEditBodyFat(entry.bodyFatPercent != null ? String(entry.bodyFatPercent) : "");
    setEditMuscle(entry.skeletalMuscleMass != null ? String(entry.skeletalMuscleMass) : "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    const weightNum = parseWeightInput(editWeight);
    if (!weightNum) {
      setError("Isi berat badan yang valid.");
      return;
    }
    const bodyFatNum = editBodyFat.trim() ? parseWeightInput(editBodyFat) : null;
    const muscleNum = editMuscle.trim() ? parseWeightInput(editMuscle) : null;

    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`${basePath}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: weightNum,
          bodyFatPercent: bodyFatNum ?? undefined,
          skeletalMuscleMass: muscleNum ?? undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      setData(body.entries);
      setEditingId(null);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`${basePath}/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Gagal menghapus catatan.");
        return;
      }
      setData(body.entries);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPendingId(null);
    }
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">Belum ada data body metrics.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Berat Terakhir" value={`${latest?.weight}kg`} accent />
        <StatTile label="Body Fat Terakhir" value={latest?.bodyFatPercent != null ? `${latest.bodyFatPercent}%` : "-"} />
        <StatTile
          label="Skeletal Muscle Terakhir"
          value={latest?.skeletalMuscleMass != null ? `${latest.skeletalMuscleMass}kg` : "-"}
        />
      </div>

      <Card>
        <h3 className="mb-3 font-display text-lg font-semibold">Berat Badan</h3>
        <MiniChart data={weightChart} dataKey="Berat" unit="kg" color="var(--accent)" />
      </Card>

      <Card>
        <h3 className="mb-3 font-display text-lg font-semibold">Body Fat %</h3>
        <MiniChart data={bodyFatChart} dataKey="Body Fat" unit="%" color="#f59e0b" />
      </Card>

      <Card>
        <h3 className="mb-3 font-display text-lg font-semibold">Skeletal Muscle Mass</h3>
        <MiniChart data={muscleChart} dataKey="Muscle" unit="kg" color="#34d399" />
      </Card>

      <Card>
        <h3 className="mb-3 font-display text-lg font-semibold">Riwayat</h3>
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-3">Tanggal</th>
                <th className="pb-2 pr-3">Berat</th>
                <th className="pb-2 pr-3">Body Fat</th>
                <th className="pb-2 pr-3">Skeletal Muscle</th>
                <th className="pb-2 pr-3">Catatan</th>
                {(canEdit || canDelete) && <th className="pb-2" />}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((e) =>
                editingId === e.id ? (
                  <tr key={e.id} className="border-b border-border bg-surface-2 last:border-0">
                    <td className="py-2 pr-3">{formatDate(e.recordedDate)}</td>
                    <td className="py-2 pr-3">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editWeight}
                        onChange={(ev) => setEditWeight(ev.target.value)}
                        className="!py-1 w-20"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editBodyFat}
                        onChange={(ev) => setEditBodyFat(ev.target.value)}
                        className="!py-1 w-16"
                        placeholder="-"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editMuscle}
                        onChange={(ev) => setEditMuscle(ev.target.value)}
                        className="!py-1 w-20"
                        placeholder="-"
                      />
                    </td>
                    <td className="py-2 pr-3 text-muted">{e.note ?? "—"}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={cancelEdit}>
                          Batal
                        </Button>
                        <Button
                          type="button"
                          className="px-2 py-1 text-xs"
                          disabled={pendingId === e.id}
                          onClick={() => saveEdit(e.id)}
                        >
                          {pendingId === e.id ? "..." : "Simpan"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">{formatDate(e.recordedDate)}</td>
                    <td className="py-2 pr-3">{e.weight}kg</td>
                    <td className="py-2 pr-3">{e.bodyFatPercent != null ? `${e.bodyFatPercent}%` : "—"}</td>
                    <td className="py-2 pr-3">{e.skeletalMuscleMass != null ? `${e.skeletalMuscleMass}kg` : "—"}</td>
                    <td className="py-2 pr-3 text-muted">{e.note ?? "—"}</td>
                    {(canEdit || canDelete) && (
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => startEdit(e)}
                              disabled={pendingId === e.id}
                              aria-label="Edit catatan"
                              className="text-muted hover:text-foreground disabled:opacity-50"
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(e.id)}
                              disabled={pendingId === e.id}
                              aria-label="Hapus catatan"
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
