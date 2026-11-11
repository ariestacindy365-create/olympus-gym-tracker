"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { ProofImageUpload } from "@/components/leads/ProofImageUpload";
import { formatRupiah, packageDetail } from "@/lib/packages";

export interface ShopPackage {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  credits: number | null;
}

export interface ShopPaymentInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImage: string | null;
}

export interface OpenOrder {
  id: string;
  packageName: string;
  price: number;
  uniqueCode: number;
  durationDays: number;
  credits: number | null;
}

/** Step 1: pick a package. Step 2 (an unpaid order): pay the exact amount and send the proof. */
export function MembershipShop({
  packages,
  info,
  lastWa,
  lastSender,
  openOrder,
  blocked,
}: {
  packages: ShopPackage[];
  info: ShopPaymentInfo;
  lastWa: string;
  lastSender: string;
  /** Picked, not paid yet. */
  openOrder: OpenOrder | null;
  /** A purchase is already waiting for the admin. */
  blocked: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!info.qrisImage && !info.accountNumber) {
    return <p className="text-sm text-muted">Pembelian lewat aplikasi belum dibuka. Hubungi admin Olympus untuk perpanjang member.</p>;
  }
  if (openOrder) return <PayStep order={openOrder} info={info} lastWa={lastWa} lastSender={lastSender} />;

  async function start() {
    if (!picked) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/member/membership-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: picked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal. Coba lagi.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {packages.map((p) => {
          const on = picked === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={blocked}
                onClick={() => setPicked(on ? null : p.id)}
                aria-pressed={on}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition disabled:opacity-50 ${
                  on ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <span>
                  <span className="block font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted">{packageDetail(p)}</span>
                </span>
                <span className="shrink-0 font-display text-lg font-bold">{formatRupiah(p.price)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {packages.length === 0 && <p className="text-sm text-muted">Belum ada paket yang dijual di aplikasi.</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {picked && !blocked && (
        <Button type="button" disabled={pending} onClick={start}>
          {pending ? "..." : "Lanjut ke pembayaran"}
        </Button>
      )}
    </div>
  );
}

function PayStep({ order, info, lastWa, lastSender }: { order: OpenOrder; info: ShopPaymentInfo; lastWa: string; lastSender: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const hasTransfer = !!info.accountNumber;
  const [method, setMethod] = useState<"QRIS" | "TRANSFER">(info.qrisImage ? "QRIS" : "TRANSFER");
  const [wa, setWa] = useState(lastWa);
  const [sender, setSender] = useState(lastSender);
  const [proof, setProof] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = order.price + order.uniqueCode;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} disalin`);
    } catch {
      toast.error("Tidak bisa menyalin, salin manual ya.");
    }
  }

  async function submit() {
    setError(null);
    if (!proof) {
      setError("Upload bukti pembayaran dulu.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/member/membership-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method, waNumber: wa, senderName: sender, proofImage: proof }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim. Coba lagi.");
        return;
      }
      toast.success("Bukti terkirim, tunggu verifikasi admin ya");
      router.refresh();
    } catch {
      setError("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  async function cancel() {
    const ok = await confirmDialog({ title: "Batalkan pembelian?", description: "Kalau sudah terlanjur bayar, kirim buktinya saja, jangan dibatalkan.", confirmLabel: "Batalkan", danger: true });
    if (!ok) return;
    const res = await fetch(`/api/member/membership-orders/${order.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) toast.error("Gagal membatalkan. Coba lagi.");
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pembayaran</p>
        <p className="font-display text-lg font-semibold">{order.packageName}</p>
        <p className="text-xs text-muted">{packageDetail(order)}</p>
      </div>

      <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
        <p className="text-sm">Bayar tepat</p>
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-3xl font-bold tabular-nums">
            {formatRupiah(amount).slice(0, -3)}
            <span className="rounded bg-amber-300 px-1 text-slate-900">{formatRupiah(amount).slice(-3)}</span>
          </p>
          <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => copy(String(amount), "Nominal")}>
            Salin
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted">3 angka terakhir adalah kode unik supaya pembayaranmu mudah dicek admin. Jangan dibulatkan ya.</p>
      </div>

      {info.qrisImage && hasTransfer && (
        <div role="tablist" aria-label="Cara bayar" className="flex gap-1 rounded-lg bg-surface-2 p-1">
          {(["QRIS", "TRANSFER"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={method === m}
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${method === m ? "bg-surface shadow-card" : "text-muted"}`}
            >
              {m === "QRIS" ? "QRIS" : "Transfer bank"}
            </button>
          ))}
        </div>
      )}

      {method === "QRIS" && info.qrisImage ? (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={info.qrisImage} alt="QRIS Olympus" className="w-full max-w-[280px] rounded-lg border border-border bg-white p-2" />
          <p className="text-center text-sm">Scan dengan e-wallet atau m-banking, lalu ketik nominal di atas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-4 py-3 text-sm">
          <p className="font-semibold">{info.bankName}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-xl font-bold tracking-wide">{info.accountNumber}</span>
            <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => copy(info.accountNumber.replace(/\s/g, ""), "Nomor rekening")}>
              Salin
            </Button>
          </div>
          <p className="text-muted">a.n. {info.accountName}</p>
        </div>
      )}

      <div>
        <label htmlFor="sender" className="mb-1 block text-xs text-muted">
          Nama pemilik rekening / akun pengirim
        </label>
        <Input id="sender" placeholder="Nama yang muncul di mutasi" value={sender} onChange={(e) => setSender(e.target.value)} />
      </div>
      <div>
        <label htmlFor="wa" className="mb-1 block text-xs text-muted">
          Nomor WhatsApp (untuk dihubungi admin)
        </label>
        <Input id="wa" inputMode="tel" placeholder="08xxxxxxxxxx" value={wa} onChange={(e) => setWa(e.target.value)} />
      </div>

      <ProofImageUpload value={proof} onChange={setProof} label="Bukti pembayaran (screenshot / foto struk)" />

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" disabled={pending} onClick={submit} className="flex-1">
          {pending ? "Mengirim..." : "Kirim bukti pembayaran"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={cancel}>
          Batalkan
        </Button>
      </div>
      <p className="text-xs text-muted">Admin mengecek uangnya sudah masuk, lalu member aktif. Kamu dapat notifikasi di aplikasi.</p>
    </Card>
  );
}

/** Cancels the member's purchase while it still waits for the admin. */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [pending, setPending] = useState(false);
  async function cancel() {
    const ok = await confirmDialog({ title: "Batalkan pembelian?", description: "Kalau sudah transfer, hubungi admin ya.", confirmLabel: "Batalkan", danger: true });
    if (!ok) return;
    setPending(true);
    const res = await fetch(`/api/member/membership-orders/${orderId}`, { method: "DELETE" }).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      toast.error("Gagal membatalkan. Coba lagi.");
      return;
    }
    router.refresh();
  }
  return (
    <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" disabled={pending} onClick={cancel}>
      Batalkan
    </Button>
  );
}
