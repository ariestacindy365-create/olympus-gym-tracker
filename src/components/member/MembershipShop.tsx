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

/** Packages to buy, then pay by QRIS/transfer and send the proof. */
export function MembershipShop({
  packages,
  info,
  lastWa,
  blocked,
}: {
  packages: ShopPackage[];
  info: ShopPaymentInfo;
  lastWa: string;
  /** A purchase is already waiting for the admin. */
  blocked: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [picked, setPicked] = useState<ShopPackage | null>(null);
  const hasTransfer = !!info.accountNumber;
  const [method, setMethod] = useState<"QRIS" | "TRANSFER">(info.qrisImage ? "QRIS" : "TRANSFER");
  const [wa, setWa] = useState(lastWa);
  const [proof, setProof] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!info.qrisImage && !hasTransfer) {
    return <p className="text-sm text-muted">Pembelian lewat aplikasi belum dibuka. Hubungi admin Olympus untuk perpanjang member.</p>;
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} disalin`);
    } catch {
      toast.error("Tidak bisa menyalin, salin manual ya.");
    }
  }

  async function submit() {
    if (!picked) return;
    setError(null);
    if (!proof) {
      setError("Upload bukti pembayaran dulu.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/member/membership-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: picked.id, paymentMethod: method, waNumber: wa, proofImage: proof }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim. Coba lagi.");
        return;
      }
      toast.success("Bukti terkirim, tunggu konfirmasi admin ya");
      setPicked(null);
      setProof(null);
      router.refresh();
    } catch {
      setError("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {packages.map((p) => {
          const on = picked?.id === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={blocked}
                onClick={() => setPicked(on ? null : p)}
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

      {picked && (
        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pembayaran</p>
            <p className="font-display text-lg font-semibold">
              {picked.name} · {formatRupiah(picked.price)}
            </p>
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
              <p className="text-center text-sm">
                Scan dengan e-wallet atau m-banking, bayar <span className="font-semibold">{formatRupiah(picked.price)}</span>.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-4 py-3 text-sm">
              <p>
                Transfer <span className="font-semibold">{formatRupiah(picked.price)}</span> ke:
              </p>
              <p className="font-semibold">{info.bankName}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xl font-bold tracking-wide">{info.accountNumber}</span>
                <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => copy(info.accountNumber.replace(/\s/g, ""), "Nomor rekening")}>
                  Salin
                </Button>
              </div>
              <p className="text-muted">a.n. {info.accountName}</p>
              <button type="button" className="self-start text-xs text-accent underline" onClick={() => copy(String(picked.price), "Nominal")}>
                Salin nominal
              </button>
            </div>
          )}

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
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setPicked(null)}>
              Batal
            </Button>
          </div>
          <p className="text-xs text-muted">Member aktif setelah admin mengecek pembayaranmu. Kamu dapat notifikasi di aplikasi.</p>
        </Card>
      )}
    </div>
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
