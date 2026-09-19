"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";

interface SaleHistoryRow {
  id: string;
  productName: string;
  price: number;
  paymentMethod: string;
  createdAt: string;
  createdBy: { name: string };
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SalesHistory({ isAdmin }: { isAdmin: boolean }) {
  const [from, setFrom] = useState(todayInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [sales, setSales] = useState<SaleHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memuat riwayat.");
        return;
      }
      setSales(data.sales);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [from, to]);

  async function handleDelete(saleId: string) {
    if (!confirm("Hapus transaksi ini? Stok produk akan otomatis dikembalikan.")) return;
    setDeletingId(saleId);
    try {
      const res = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Gagal menghapus transaksi.");
        return;
      }
      setSales((prev) => prev.filter((s) => s.id !== saleId));
    } catch {
      alert("Terjadi kesalahan. Coba lagi.");
    } finally {
      setDeletingId(null);
    }
  }

  const total = sales.reduce((sum, s) => sum + s.price, 0);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold">Riwayat Transaksi</h2>
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

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted">{sales.length} transaksi</span>
        <span className="text-sm font-semibold">{formatRupiah(total)}</span>
      </div>

      {!loading && sales.length === 0 ? (
        <p className="text-sm text-muted">Tidak ada transaksi pada rentang tanggal ini.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sales.map((sale) => (
            <li
              key={sale.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
            >
              <span>
                {sale.productName}{" "}
                <span className="text-xs text-muted">
                  · {PAYMENT_METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod} · oleh {sale.createdBy.name} ·{" "}
                  {new Date(sale.createdAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatRupiah(sale.price)}</span>
                <Link href={`/leads/sales/${sale.id}/receipt`}>
                  <Button variant="secondary" className="px-2 py-1 text-xs">
                    Cetak Struk
                  </Button>
                </Link>
                {isAdmin && (
                  <Button
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    disabled={deletingId === sale.id}
                    onClick={() => handleDelete(sale.id)}
                  >
                    {deletingId === sale.id ? "..." : "Hapus"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
