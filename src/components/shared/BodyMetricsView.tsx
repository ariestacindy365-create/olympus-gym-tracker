"use client";

import { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { parseWeightInput } from "@/lib/parseWeight";
import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import {
  OMRON_FIELDS,
  LEGACY_FIELDS,
  formatMetric,
  type BodyMetricEntry,
  type BodyMetricKey,
} from "@/lib/bodyMetricFields";

export type { BodyMetricEntry };

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
  const confirmDialog = useConfirm();
  const [data, setData] = useState(entries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Record<BodyMetricKey, string>>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...data].sort((a, b) => new Date(a.recordedDate).getTime() - new Date(b.recordedDate).getTime());
  const latest = sorted.at(-1) ?? null;
  const tableRows = [...sorted].reverse();

  // Old InBody columns only show up for members who actually have such
  // readings; everyone else just sees the Omron fields.
  const columns = [...OMRON_FIELDS, ...LEGACY_FIELDS.filter((f) => sorted.some((e) => e[f.key] != null))];
  const charts = columns
    .map((field) => ({
      field,
      points: sorted
        .filter((e) => e[field.key] != null)
        .map((e) => ({ date: formatDate(e.recordedDate), value: e[field.key] as number })),
    }))
    // A one-point line says nothing yet; the tile above already shows it.
    .filter((c) => c.field.key === "weight" || c.points.length >= 2);

  function startEdit(entry: BodyMetricEntry) {
    setEditingId(entry.id);
    setEditValues(
      Object.fromEntries(OMRON_FIELDS.map((f) => [f.key, entry[f.key] != null ? String(entry[f.key]) : ""]))
    );
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    const parsedValues: Partial<Record<BodyMetricKey, number>> = {};
    for (const field of OMRON_FIELDS) {
      const raw = editValues[field.key]?.trim() ?? "";
      if (!raw) {
        if (field.key === "weight") {
          setError("Isi berat badan yang valid.");
          return;
        }
        continue;
      }
      const num = parseWeightInput(raw);
      if (!num) {
        setError(`Isi ${field.label} yang valid.`);
        return;
      }
      parsedValues[field.key] = num;
    }

    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`${basePath}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Keep the entry's note; the edit row doesn't expose it.
        body: JSON.stringify({ ...parsedValues, note: data.find((e) => e.id === id)?.note ?? undefined }),
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
    const ok = await confirmDialog({ description: "Hapus catatan ini?", confirmLabel: "Hapus", danger: true });
    if (!ok) return;
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {OMRON_FIELDS.map((field) => (
          <StatTile
            key={field.key}
            label={field.label}
            value={formatMetric(field, latest?.[field.key])}
            accent={field.key === "weight"}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {charts.map(({ field, points }) => (
          <Card key={field.key}>
            <h3 className="mb-3 font-display text-lg font-semibold">
              {field.label}
              {field.unit && <span className="ml-1 text-sm font-normal text-muted">({field.unit})</span>}
            </h3>
            <MiniChart
              data={points}
              dataKey={field.label}
              unit={field.unit === "%" || field.unit === "kg" ? field.unit : ""}
              color={field.chartColor}
            />
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="mb-3 font-display text-lg font-semibold">Riwayat</h3>
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-3">Tanggal</th>
                {columns.map((field) => (
                  <th key={field.key} className="whitespace-nowrap pb-2 pr-3">
                    {field.label}
                  </th>
                ))}
                <th className="pb-2 pr-3">Catatan</th>
                {(canEdit || canDelete) && <th className="pb-2" />}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((e) =>
                editingId === e.id ? (
                  <tr key={e.id} className="border-b border-border bg-surface-2 last:border-0">
                    <td className="py-2 pr-3">{formatDate(e.recordedDate)}</td>
                    {columns.map((field) => (
                      <td key={field.key} className="py-2 pr-3">
                        {OMRON_FIELDS.includes(field) ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            aria-label={field.label}
                            value={editValues[field.key] ?? ""}
                            onChange={(ev) => setEditValues((prev) => ({ ...prev, [field.key]: ev.target.value }))}
                            className="!py-1 w-20"
                            placeholder="-"
                          />
                        ) : (
                          <span className="text-muted">{formatMetric(field, e[field.key])}</span>
                        )}
                      </td>
                    ))}
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
                    {columns.map((field) => (
                      <td key={field.key} className="whitespace-nowrap py-2 pr-3">
                        {formatMetric(field, e[field.key])}
                      </td>
                    ))}
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
                              className="rounded-md p-1.5 text-base text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                            >
                              <EditIcon />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(e.id)}
                              disabled={pendingId === e.id}
                              aria-label="Hapus catatan"
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
    </div>
  );
}
