"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";
import { scanSuccessFeedback, scanErrorFeedback } from "@/lib/scanFeedback";

export interface SaleRow {
  id: string;
  productName: string;
  price: number;
  paymentMethod: string;
  createdAt: string;
  note?: string | null;
}

export function KasirScan({ initialSales, isAdmin }: { initialSales: SaleRow[]; isAdmin: boolean }) {
  const confirmDialog = useConfirm();
  const [barcode, setBarcode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("TUNAI");
  const [note, setNote] = useState("");
  const [sales, setSales] = useState(initialSales);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Scans are queued and sent one at a time instead of being dropped while a
  // request is in flight. The input is never disabled and is emptied the
  // moment Enter is pressed (not when the server replies): a scanner types a
  // whole barcode in a few ms, so clearing it on the response of the
  // *previous* scan used to wipe the first digits of the *next* one, leaving
  // a truncated, wrong number. Whether a scan is a duplicate of a recent sale
  // is decided server-side, with a confirmable warning (see submitScan).
  const queueRef = useRef<{ code: string; paymentMethod: string; note: string | undefined }[]>([]);
  const processingRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submitScan(item: { code: string; paymentMethod: string; note: string | undefined }, confirmDuplicate: boolean) {
    setFeedback(null);
    try {
      const res = await fetch("/api/sales/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: item.code,
          paymentMethod: item.paymentMethod,
          confirmDuplicate,
          note: item.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.duplicateWarning) {
          const proceed = await confirmDialog({
            title: "Sudah dicatat baru-baru ini",
            description: data.error,
            confirmLabel: "Catat lagi",
            autoFocusConfirm: false,
          });
          inputRef.current?.focus();
          if (proceed) {
            await submitScan(item, true);
            return;
          }
        }
        scanErrorFeedback();
        setFeedback({ type: "error", text: data.error ?? "Gagal memproses scan." });
        return;
      }
      scanSuccessFeedback();
      setFeedback({
        type: "success",
        text: `${data.sale.productName} — ${formatRupiah(data.sale.price)} (stok tersisa: ${data.stock})`,
      });
      setSales((prev) => [
        {
          id: data.sale.id,
          productName: data.sale.productName,
          price: data.sale.price,
          paymentMethod: item.paymentMethod,
          createdAt: data.sale.createdAt,
          note: data.sale.note,
        },
        ...prev,
      ]);
    } catch {
      scanErrorFeedback();
      setFeedback({ type: "error", text: "Terjadi kesalahan. Coba lagi." });
    }
  }

  async function processQueue() {
    if (processingRef.current) return;
    processingRef.current = true;
    setPending(true);
    try {
      let item = queueRef.current.shift();
      while (item) {
        await submitScan(item, false);
        item = queueRef.current.shift();
      }
    } finally {
      processingRef.current = false;
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;

    queueRef.current.push({ code, paymentMethod, note: note.trim() || undefined });
    setBarcode("");
    setNote("");
    void processQueue();
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
          <div>
            <label className="mb-1 block text-xs text-muted">Catatan (opsional, mis. &quot;buat bos&quot;)</label>
            <Input placeholder="Catatan..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Scan barcode di sini..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">{pending ? "..." : "Jual"}</Button>
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
          <EmptyState title="Belum ada penjualan" description="Transaksi hari ini akan muncul di sini." />
        ) : (
          <ul className="flex flex-col gap-2">
            {sales.map((sale) => (
              <li key={sale.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span>
                  {sale.productName}{" "}
                  <span className="text-xs text-muted">
                    · {PAYMENT_METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod} ·{" "}
                    {new Date(sale.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    {sale.note && ` · "${sale.note}"`}
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
