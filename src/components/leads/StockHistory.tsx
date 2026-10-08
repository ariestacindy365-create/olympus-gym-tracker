"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { StockMovement, StockMovementType } from "@/app/api/products/stock-history/route";

const TYPE_LABEL: Record<StockMovementType, string> = {
  RESTOCK: "Restock",
  SALE: "Terjual",
  SALE_DELETED: "Penjualan dihapus (stok kembali)",
  INITIAL: "Stok awal",
  EDIT: "Stok diubah manual",
};

interface ProductOption {
  id: string;
  name: string;
  stock: number;
  isActive: boolean;
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Every stock in (+) and out (−) for a date range, optionally per product. */
export function StockHistory() {
  const [from, setFrom] = useState(todayInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [productId, setProductId] = useState("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (productId) params.set("productId", productId);
      const res = await fetch(`/api/products/stock-history?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memuat riwayat stok.");
        return;
      }
      setMovements(data.movements);
      setProducts(data.products);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Syncs to the server on every filter change — an external fetch, not
    // state derived from a prop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, productId]);

  const totalIn = movements.filter((m) => m.change > 0).reduce((sum, m) => sum + m.change, 0);
  const totalOut = movements.filter((m) => m.change < 0).reduce((sum, m) => sum - m.change, 0);
  const selected = products.find((p) => p.id === productId);

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold">Riwayat Stok</h2>
        <p className="text-xs text-muted">Kapan stok bertambah (restock, stok awal, koreksi) dan berkurang (terjual).</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Dari Tanggal</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Sampai Tanggal</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs text-muted">Produk</label>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Semua produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {!p.isActive ? " (nonaktif)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={load} disabled={loading}>
          {loading ? "Memuat..." : "Cari"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-success/10 px-2 py-2">
          <p className="text-xs text-muted">Masuk</p>
          <p className="tabular font-display text-xl font-bold text-success">+{totalIn}</p>
        </div>
        <div className="rounded-lg bg-danger/10 px-2 py-2">
          <p className="text-xs text-muted">Keluar</p>
          <p className="tabular font-display text-xl font-bold text-danger">−{totalOut}</p>
        </div>
        <div className="rounded-lg bg-surface-2 px-2 py-2">
          <p className="text-xs text-muted">{selected ? "Stok sekarang" : "Transaksi"}</p>
          <p className="tabular font-display text-xl font-bold">{selected ? selected.stock : movements.length}</p>
        </div>
      </div>

      {!loading && movements.length === 0 ? (
        <EmptyState title="Tidak ada perubahan stok" description="Tidak ada stok masuk atau keluar pada rentang tanggal ini." />
      ) : (
        <ul className="flex flex-col gap-2">
          {movements.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
            >
              <span className="min-w-0">
                <span className="font-medium">{m.productName}</span>
                <span className="block text-xs text-muted">
                  {TYPE_LABEL[m.type]}
                  {m.by && ` · ${m.by}`} ·{" "}
                  {new Date(m.at).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
              <span className="tabular shrink-0 font-semibold">
                <span className={m.change > 0 ? "text-success" : "text-danger"}>
                  {m.change > 0 ? `+${m.change}` : `−${Math.abs(m.change)}`}
                </span>
                {m.stockAfter != null && <span className="ml-1 text-xs font-normal text-muted">→ stok {m.stockAfter}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
