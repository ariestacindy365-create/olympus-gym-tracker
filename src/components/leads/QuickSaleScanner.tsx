"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";
import { scanSuccessFeedback, scanErrorFeedback } from "@/lib/scanFeedback";
import type { SaleRow } from "@/components/leads/KasirScan";

// Fired after each unit is recorded so an open Kasir page can add it to its
// "Penjualan Hari Ini" list without a reload.
export const SALE_RECORDED_EVENT = "olympus:sale-recorded";

// A USB/Bluetooth barcode scanner "types" the code far faster than a person
// and ends with Enter. Keys arriving closer together than this belong to
// the same scan; anything slower is a human and is ignored.
const MAX_KEY_GAP_MS = 50;
const MIN_BARCODE_LENGTH = 4;

interface CartItem {
  barcode: string;
  name: string;
  price: number;
  stock: number;
  qty: number;
}

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Listens for scanner input on every admin page (no need to open Kasir or
 * click into the barcode field) and collects scans in a popup cart; one tap
 * on a payment method records them all. Typing inside a form field is left
 * alone, so the Kasir page's own scan box and every other input keep
 * working as before.
 */
export function QuickSaleScanner() {
  const confirmDialog = useConfirm();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const pendingRef = useRef(false);

  const addScan = useCallback(async (barcode: string) => {
    setOpen(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/lookup?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      if (!res.ok) {
        scanErrorFeedback();
        setError(data.error ?? "Produk tidak ditemukan.");
        return;
      }
      const product = data.product as { barcode: string; name: string; price: number; stock: number };
      let overStock = false;
      setCart((prev) => {
        const existing = prev.find((i) => i.barcode === product.barcode);
        if (existing) {
          if (existing.qty + 1 > product.stock) {
            overStock = true;
            return prev;
          }
          return prev.map((i) => (i.barcode === product.barcode ? { ...i, qty: i.qty + 1, stock: product.stock } : i));
        }
        return [...prev, { ...product, qty: 1 }];
      });
      if (overStock) {
        scanErrorFeedback();
        setError(`Stok "${product.name}" tinggal ${product.stock}.`);
      }
    } catch {
      scanErrorFeedback();
      setError("Gagal membaca produk. Coba scan lagi.");
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const now = performance.now();
      const fast = now - lastKeyAtRef.current <= MAX_KEY_GAP_MS;

      if (e.key === "Enter" || e.key === "Tab") {
        const code = bufferRef.current;
        bufferRef.current = "";
        if (fast && code.length >= MIN_BARCODE_LENGTH && !pendingRef.current) {
          // Keep the scanner's Enter from also "clicking" whatever button
          // happens to have focus.
          e.preventDefault();
          void addScan(code);
        }
        return;
      }
      if (e.key.length !== 1) return;
      bufferRef.current = fast ? bufferRef.current + e.key : e.key;
      lastKeyAtRef.current = now;
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [addScan]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function close() {
    setOpen(false);
    setCart([]);
    setError(null);
  }

  function changeQty(barcode: string, delta: number) {
    setError(null);
    setCart((prev) =>
      prev
        .map((i) => (i.barcode === barcode ? { ...i, qty: Math.min(i.stock, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  }

  async function sellOne(item: CartItem, paymentMethod: string, confirmDuplicate: boolean): Promise<boolean> {
    const res = await fetch("/api/sales/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: item.barcode, paymentMethod, confirmDuplicate }),
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
        return proceed ? sellOne(item, paymentMethod, true) : false;
      }
      throw new Error(data.error ?? "Gagal mencatat penjualan.");
    }
    const sale: SaleRow = {
      id: data.sale.id,
      productName: data.sale.productName,
      price: data.sale.price,
      paymentMethod,
      createdAt: data.sale.createdAt,
      note: data.sale.note,
    };
    window.dispatchEvent(new CustomEvent<SaleRow>(SALE_RECORDED_EVENT, { detail: sale }));
    return true;
  }

  async function record(paymentMethod: string) {
    if (cart.length === 0 || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    let units = 0;
    let total = 0;
    const remaining = cart.map((i) => ({ ...i }));
    try {
      for (const item of remaining) {
        // Only the first unit of each product goes through the server's
        // "just scanned" check; extra units in the same cart are intentional.
        let first = true;
        while (item.qty > 0) {
          const ok = await sellOne(item, paymentMethod, !first);
          first = false;
          if (!ok) {
            // Admin said not to record it again: drop the whole line.
            item.qty = 0;
            break;
          }
          item.qty -= 1;
          units += 1;
          total += item.price;
        }
      }
      if (units > 0) {
        scanSuccessFeedback();
        setToast(`Tercatat ${units} item · ${formatRupiah(total)} · ${PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod}`);
      }
      close();
    } catch (e) {
      scanErrorFeedback();
      setCart(remaining.filter((i) => i.qty > 0));
      setError(
        `${e instanceof Error ? e.message : "Gagal mencatat penjualan."}${
          units > 0 ? ` (${units} item sudah tercatat, sisanya masih di sini.)` : ""
        }`
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 animate-fade-in sm:items-center sm:p-4 print:hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-sale-title"
            className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 shadow-overlay animate-sheet-up sm:rounded-2xl sm:animate-pop-in"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="quick-sale-title" className="font-display text-lg font-bold">
                  Kasir Cepat
                </h2>
                <p className="text-xs text-muted">Scan barang lain untuk menambah. Pilih metode bayar untuk mencatat.</p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                aria-label="Tutup kasir cepat"
                className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {cart.length > 0 ? (
              <ul className="mt-4 flex flex-col divide-y divide-border rounded-xl border border-border">
                {cart.map((item) => (
                  <li key={item.barcode} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted">
                        {formatRupiah(item.price)} · stok {item.stock}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => changeQty(item.barcode, -1)}
                        disabled={pending}
                        aria-label={`Kurangi ${item.name}`}
                        className="h-8 w-8 rounded-lg border border-border text-lg leading-none hover:bg-surface-2 disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="tabular w-6 text-center font-semibold">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(item.barcode, 1)}
                        disabled={pending || item.qty >= item.stock}
                        aria-label={`Tambah ${item.name}`}
                        className="h-8 w-8 rounded-lg border border-border text-lg leading-none hover:bg-surface-2 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !error && <p className="mt-4 text-sm text-muted">Membaca barcode...</p>
            )}

            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            {cart.length > 0 && (
              <>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted">Total</span>
                  <span className="tabular font-display text-2xl font-bold">{formatRupiah(total)}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={value === "TUNAI" || value === "QRIS" ? "primary" : "secondary"}
                      disabled={pending}
                      onClick={() => record(value)}
                      className="py-3"
                    >
                      {pending ? "..." : label}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-xl bg-success px-4 py-3 text-sm font-semibold text-white shadow-overlay animate-pop-in print:hidden"
        >
          ✓ {toast}
        </div>
      )}
    </>
  );
}
