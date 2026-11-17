"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { ProofImageUpload } from "@/components/leads/ProofImageUpload";
import { formatRupiah } from "@/lib/packages";
import { packageDetail } from "@/lib/packageRules";

export interface ShopPackage {
  id: string;
  name: string;
  price: number;
  credits: number | null;
  durationDays: number | null;
  durationMonths: number | null;
  category: string;
  fineprint: string | null;
}

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface OpenOrder {
  id: string;
  packageName: string;
  price: number;
  uniqueCode: number;
  credits: number | null;
  durationDays: number | null;
  durationMonths: number | null;
}

/** Step 1: pick a package. Step 2 (an unpaid order): transfer the exact amount and send the proof. */
export function PackageShop({ packages, bank, lastWa, lastSender, openOrder, blocked }: { packages: ShopPackage[]; bank: BankInfo; lastWa: string; lastSender: string; openOrder: OpenOrder | null; blocked: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bank.accountNumber) return <p className="text-sm text-muted">Pembelian lewat aplikasi belum dibuka. Hubungi admin Olympus.</p>;
  if (openOrder) return <PayStep order={openOrder} bank={bank} lastWa={lastWa} lastSender={lastSender} />;

  async function start() {
    if (!picked) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/member/membership-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: picked }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Gagal. Coba lagi.");
      router.refresh();
    } catch {
      toast.error("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  const categories = [...new Set(packages.map((p) => p.category))];
  const chosen = packages.find((p) => p.id === picked);
  return (
    <div className="flex flex-col gap-4">
      {categories.map((cat) => (
        <section key={cat} className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-bold">{cat}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {packages
              .filter((p) => p.category === cat)
              .map((p) => {
                const on = picked === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => setPicked(on ? null : p.id)}
                      aria-pressed={on}
                      className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition disabled:opacity-50 ${on ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-border-strong"}`}
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold">{p.name}</span>
                        <span className="block text-xs text-muted">{packageDetail(p)}</span>
                        {p.fineprint && <span className="mt-0.5 block text-xs text-muted">{p.fineprint}</span>}
                      </span>
                      <span className="shrink-0 font-display text-lg font-bold">{formatRupiah(p.price)}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      {packages.length === 0 && <p className="text-sm text-muted">Belum ada paket yang dijual di aplikasi.</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {chosen && !blocked && (
        <div className="sticky bottom-[5.5rem] z-20 sm:bottom-4">
          <Button type="button" disabled={pending} onClick={start} className="h-12 w-full shadow-overlay">
            {pending ? "…" : `Beli ${chosen.name} · ${formatRupiah(chosen.price)}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function PayStep({ order, bank, lastWa, lastSender }: { order: OpenOrder; bank: BankInfo; lastWa: string; lastSender: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [wa, setWa] = useState(lastWa);
  const [sender, setSender] = useState(lastSender);
  const [proof, setProof] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = order.price + order.uniqueCode;
  const amountText = formatRupiah(amount);

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
    if (!proof) return setError("Upload bukti transfer dulu.");
    setPending(true);
    try {
      const res = await fetch(`/api/member/membership-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waNumber: wa, senderName: sender, proofImage: proof }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Gagal mengirim. Coba lagi.");
      toast.success("Bukti terkirim, tunggu verifikasi admin ya");
      router.refresh();
    } catch {
      setError("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  async function cancel() {
    if (!(await confirmDialog({ title: "Batalkan pembelian?", description: "Kalau sudah terlanjur transfer, kirim buktinya saja, jangan dibatalkan.", confirmLabel: "Batalkan", danger: true }))) return;
    const res = await fetch(`/api/member/membership-orders/${order.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) toast.error("Gagal membatalkan. Coba lagi.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pembayaran</p>
        <p className="font-display text-xl font-bold">{order.packageName}</p>
        <p className="text-xs text-muted">{packageDetail(order)}</p>
      </div>

      <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
        <p className="text-sm">Transfer tepat</p>
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-3xl font-bold tabular-nums">
            {amountText.slice(0, -3)}
            <span className="rounded bg-amber-300 px-1 text-slate-900">{amountText.slice(-3)}</span>
          </p>
          <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => copy(String(amount), "Nominal")}>
            Salin
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted">3 angka terakhir adalah kode unik supaya transfermu mudah dicek admin. Jangan dibulatkan ya.</p>
      </div>

      <div className="flex flex-col gap-1 rounded-xl bg-surface-2 px-4 py-3 text-sm">
        <p className="font-semibold">Transfer ke {bank.bankName}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-2xl font-bold tracking-wide">{bank.accountNumber}</span>
          <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => copy(bank.accountNumber.replace(/[\s-]/g, ""), "Nomor rekening")}>
            Salin
          </Button>
        </div>
        <p className="text-muted">a.n. {bank.accountName}</p>
      </div>

      <div>
        <label htmlFor="sender" className="mb-1 block text-xs text-muted">
          Nama pemilik rekening pengirim
        </label>
        <Input id="sender" placeholder="Nama yang muncul di mutasi" value={sender} onChange={(e) => setSender(e.target.value)} />
      </div>
      <div>
        <label htmlFor="wa" className="mb-1 block text-xs text-muted">
          Nomor WhatsApp (untuk dihubungi admin)
        </label>
        <Input id="wa" inputMode="tel" placeholder="08xxxxxxxxxx" value={wa} onChange={(e) => setWa(e.target.value)} />
      </div>

      <ProofImageUpload value={proof} onChange={setProof} label="Bukti transfer (screenshot / foto struk)" />

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" disabled={pending} onClick={submit} className="h-12 flex-1">
          {pending ? "Mengirim…" : "Kirim bukti transfer"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={cancel}>
          Batalkan
        </Button>
      </div>
      <p className="text-xs text-muted">Admin mengecek transfernya sudah masuk, lalu paket aktif. Kamu dapat notifikasi di aplikasi.</p>
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
    if (!(await confirmDialog({ title: "Batalkan pembelian?", description: "Kalau sudah transfer, hubungi admin ya.", confirmLabel: "Batalkan", danger: true }))) return;
    setPending(true);
    const res = await fetch(`/api/member/membership-orders/${orderId}`, { method: "DELETE" }).catch(() => null);
    setPending(false);
    if (!res?.ok) return toast.error("Gagal membatalkan. Coba lagi.");
    router.refresh();
  }
  return (
    <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" disabled={pending} onClick={cancel}>
      Batalkan
    </Button>
  );
}
