"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

interface RestockRow {
  id: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  createdAt: string;
  product: { name: string };
  createdBy: { name: string };
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RestockHistory() {
  const [from, setFrom] = useState(todayInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [restocks, setRestocks] = useState<RestockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/restock-history?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memuat riwayat stok.");
        return;
      }
      setRestocks(data.restocks);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Syncs to the server on every from/to change — an external fetch, not
    // state derived from a prop, so the usual set-state-in-effect concern
    // doesn't apply the way it would for local state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold">Riwayat Stok</h2>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Dari Tanggal</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Sampai Tanggal</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={load} disabled={loading}>
          {loading ? "Memuat..." : "Cari"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && restocks.length === 0 ? (
        <EmptyState title="Tidak ada penambahan stok" description="Tidak ada penambahan stok pada rentang tanggal ini." />
      ) : (
        <ul className="flex flex-col gap-2">
          {restocks.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
            >
              <span>
                {r.product.name}{" "}
                <span className="text-xs text-muted">
                  · oleh {r.createdBy.name} ·{" "}
                  {new Date(r.createdAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
              <span className="font-medium">
                <span className="text-muted">{r.stockBefore}</span>{" "}
                <span className="text-success">+{r.quantity}</span>{" "}
                <span className="text-muted">→</span> {r.stockAfter}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
