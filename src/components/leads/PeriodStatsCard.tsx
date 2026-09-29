"use client";

import { useCallback, useEffect, useState } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";

type Preset = "today" | "week" | "month" | "custom";

function toInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeFor(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const now = new Date();
  if (preset === "today") return { from: toInputValue(now), to: toInputValue(now) };
  if (preset === "week") {
    // Indonesian week: Monday to Sunday.
    return { from: toInputValue(startOfWeek(now, { weekStartsOn: 1 })), to: toInputValue(endOfWeek(now, { weekStartsOn: 1 })) };
  }
  return { from: toInputValue(startOfMonth(now)), to: toInputValue(endOfMonth(now)) };
}

const PRESET_LABEL: Record<Preset, string> = {
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  custom: "Kustom",
};

export function PeriodStatsCard() {
  const [preset, setPreset] = useState<Preset>("today");
  const [{ from, to }, setRange] = useState(() => rangeFor("today"));
  const [stats, setStats] = useState<{
    trialCount: number;
    newMemberCount: number;
    renewalCount: number;
    conversionRate: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (rangeFrom: string, rangeTo: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/period-stats?from=${rangeFrom}&to=${rangeTo}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memuat statistik.");
        return;
      }
      setStats(data);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Refetching from the network on every from/to change is the point here
    // (syncing to an external system, not deriving render state), so the
    // setState-in-effect rule doesn't apply the way it would for local state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function selectPreset(p: Exclude<Preset, "custom">) {
    setPreset(p);
    setRange(rangeFor(p));
  }

  const periodLabel =
    from === to
      ? format(new Date(from), "d MMMM yyyy", { locale: idLocale })
      : `${format(new Date(from), "d MMM yyyy", { locale: idLocale })} — ${format(new Date(to), "d MMM yyyy", { locale: idLocale })}`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">Ringkasan Periode</h2>
          <p className="text-xs text-muted">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["today", "week", "month"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => selectPreset(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                preset === p ? "bg-accent text-white" : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {PRESET_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Dari Tanggal</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setPreset("custom");
              setRange((prev) => ({ ...prev, from: e.target.value }));
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Sampai Tanggal</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setPreset("custom");
              setRange((prev) => ({ ...prev, to: e.target.value }));
            }}
          />
        </div>
        <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => load(from, to)} disabled={loading}>
          {loading ? "Memuat..." : "Cari"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Trial" value={stats?.trialCount ?? "-"} />
        <StatTile label="Jadi Member" value={stats?.newMemberCount ?? "-"} accent />
        <StatTile label="Perpanjangan" value={stats?.renewalCount ?? "-"} accent />
        <StatTile label="Conversion Rate" value={stats?.conversionRate != null ? `${stats.conversionRate}%` : "-"} accent />
      </div>
      <p className="text-xs text-muted">
        Conversion Rate = jumlah yang jadi member ÷ jumlah trial pada periode ini. Bisa lebih dari 100% kalau membernya
        berasal dari trial di periode sebelumnya.
      </p>
    </Card>
  );
}
