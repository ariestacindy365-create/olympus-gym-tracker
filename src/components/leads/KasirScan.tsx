"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";

export interface SaleRow {
  id: string;
  productName: string;
  price: number;
  paymentMethod: string;
  createdAt: string;
}

export function KasirScan({ initialSales, isAdmin }: { initialSales: SaleRow[]; isAdmin: boolean }) {
  const [barcode, setBarcode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("TUNAI");
  const [sales, setSales] = useState(initialSales);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref, not state — a scanner can fire two Enter keystrokes faster than
  // React re-renders (and re-disables the input), so the guard against a
  // simultaneous double-submit has to be synchronous, not dependent on the
  // next render. (Whether the *scan itself* is a duplicate of a recent sale
  // is decided server-side, with a confirmable warning instead of a hard
  // block — see submitScan below.)
  const submittingRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submitScan(code: string, confirmDuplicate: boolean) {
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/sales/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: code, paymentMethod, confirmDuplicate }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.duplicateWarning && confirm(`${data.error}`)) {
          await submitScan(code, true);
          return;
        }
        setFeedback({ type: "error", text: data.error ?? "Gagal memproses scan." });
        return;
      }
      setFeedback({
        type: "success",
        text: `${data.sale.productName} — ${formatRupiah(data.sale.price)} (stok tersisa: ${data.stock})`,
      });
      setSales((prev) => [
        { id: data.sale.id, productName: data.sale.productName, price: data.sale.price, paymentMethod, createdAt: data.sale.createdAt },
        ...prev,
      ]);
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan. Coba lagi." });
    } finally {
      setBarcode("");
      setPending(false);
      submittingRef.current = false;
      inputRef.current?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;

    // Guard against a second scan landing while the first is still in flight.
    if (submittingRef.current) return;
    submittingRef.current = true;

    await submitScan(code, false);
  }

  const totalToday = sales.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Scan Barcode</h2>
          <div>
            <label className="mb-1 block text-xs text-muted">Metode Pembayaran</label>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Scan barcode di sini..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={pending}
              className="flex-1"
            />
            <Button type="submit" disabled={pending}>
              {pending ? "..." : "Jual"}
            </Button>
          </form>
          {feedback && (
            <p className={`text-sm font-medium ${feedback.type === "success" ? "text-success" : "text-danger"}`}>
              {feedback.text}
            </p>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Penjualan Hari Ini</h2>
          <span className="text-sm font-semibold">{formatRupiah(totalToday)}</span>
        </div>
        {sales.length === 0 ? (
          <p className="text-sm text-muted">Belum ada penjualan hari ini.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sales.map((sale) => (
              <li key={sale.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span>
                  {sale.productName}{" "}
                  <span className="text-xs text-muted">
                    · {PAYMENT_METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod} ·{" "}
                    {new Date(sale.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatRupiah(sale.price)}</span>
                  <Link href={`/leads/sales/${sale.id}/receipt`}>
                    <Button variant="secondary" className="px-2 py-1 text-xs">
                      Cetak Struk
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
