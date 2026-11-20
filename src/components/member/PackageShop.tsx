"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { ProofImageUpload } from "@/components/leads/ProofImageUpload";
import { formatRupiah } from "@/lib/packages";
import { packageDetail } from "@/lib/packageRules";
import { QRIS_HOW_TO, VA_BANKS, VA_BANK_LABEL, VA_HOW_TO, isVaBank, type GatewayMethod, type VaBank } from "@/lib/vaBanks";

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
  /** The Midtrans virtual account made for it, if any. */
  va?: { bank: string; number: string; billerCode: string | null; expiresAt: string | null; qr?: string | null; testQrUrl?: string | null } | null;
}

/** Step 1: pick a package. Step 2 (an unpaid order): transfer the exact amount and send the proof. */
export function PackageShop({ packages, bank, lastWa, lastSender, openOrder, blocked, vaEnabled = false }: { packages: ShopPackage[]; bank: BankInfo; lastWa: string; lastSender: string; openOrder: OpenOrder | null; blocked: boolean; vaEnabled?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bank.accountNumber && !vaEnabled) return <p className="text-sm text-muted">Pembelian lewat aplikasi belum dibuka. Hubungi admin Olympus.</p>;
  if (openOrder) {
    if (!vaEnabled) return <PayStep order={openOrder} bank={bank} lastWa={lastWa} lastSender={lastSender} />;
    return <PayChoice order={openOrder} bank={bank} lastWa={lastWa} lastSender={lastSender} />;
  }

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

/** With virtual accounts on: pay by VA (activates by itself) or by manual transfer + proof. */
function PayChoice({ order, bank, lastWa, lastSender }: { order: OpenOrder; bank: BankInfo; lastWa: string; lastSender: string }) {
  const [method, setMethod] = useState<"va" | "qris" | "manual">(order.va?.bank === "qris" ? "qris" : "va");
  return (
    <div className="flex flex-col gap-3">
      {bank.accountNumber && (
        <div role="radiogroup" aria-label="Cara bayar" className="grid grid-cols-3 gap-2">
          {(
            [
              ["va", "Virtual Account", "Aktif otomatis"],
              ["qris", "QRIS", "Aktif otomatis"],
              ["manual", "Transfer manual", "Dicek admin"],
            ] as const
          ).map(([id, title, sub]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={method === id}
              onClick={() => setMethod(id)}
              className={`rounded-xl border px-3 py-2 text-left ${method === id ? "border-accent bg-accent/10" : "border-border bg-surface"}`}
            >
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-muted">{sub}</span>
            </button>
          ))}
        </div>
      )}
      {method === "manual" ? <PayStep order={order} bank={bank} lastWa={lastWa} lastSender={lastSender} /> : <VaStep key={method} order={order} mode={method} />}
    </div>
  );
}

const fmtExpiry = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

function VaStep({ order, mode }: { order: OpenOrder; mode: "va" | "qris" }) {
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const qris = mode === "qris";
  // The number/code on the order, if it's of this tab's kind.
  const va = order.va && (qris ? order.va.bank === "qris" : isVaBank(order.va.bank)) ? { ...order.va, bank: order.va.bank as VaBank } : null;
  const [picking, setPicking] = useState(!va);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function make(b: GatewayMethod) {
    setError(null);
    setPending(b);
    try {
      const res = await fetch(`/api/member/membership-orders/${order.id}/va`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bank: b }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? (qris ? "Gagal membuat kode QRIS. Coba lagi." : "Gagal membuat nomor VA. Coba lagi."));
      setPicking(false);
      router.refresh();
    } catch {
      setError("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(null);
    }
  }

  async function check(quiet = false) {
    if (!quiet) setPending("cek");
    try {
      const res = await fetch(`/api/member/membership-orders/${order.id}/va/cek`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.status === "paid") {
        toast.success("Pembayaran diterima, paket aktif ✅");
        router.refresh();
      } else if (data.status === "dead") {
        if (!quiet) toast.error(qris ? "Kode QRIS sudah kedaluwarsa. Buat kode baru ya." : "Nomor VA sudah kedaluwarsa. Buat nomor baru ya.");
        router.refresh();
      } else if (!quiet) toast.error("Belum ada pembayaran masuk. Kalau sudah bayar, tunggu sebentar lalu cek lagi.");
    } catch {
      if (!quiet) toast.error("Tidak ada koneksi. Coba lagi.");
    } finally {
      if (!quiet) setPending(null);
    }
  }

  // While the number is on screen, look every 15 s (paying in another app and coming back).
  useEffect(() => {
    if (!va || picking) return;
    const tick = () => {
      if (document.visibilityState === "visible") void check(true);
    };
    const id = setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm only when the number changes
  }, [va?.number, picking]);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} disalin`);
    } catch {
      toast.error("Tidak bisa menyalin, salin manual ya.");
    }
  }

  async function cancel() {
    if (!(await confirmDialog({ title: "Batalkan pembelian?", description: qris ? "Kode QRIS ikut dibatalkan dan tidak bisa dibayar lagi." : "Nomor VA ikut dibatalkan dan tidak bisa dibayar lagi.", confirmLabel: "Batalkan", danger: true }))) return;
    const res = await fetch(`/api/member/membership-orders/${order.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      toast.error(data?.error ?? "Gagal membatalkan. Coba lagi.");
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pembayaran · {qris ? "QRIS" : "Virtual Account"}</p>
        <p className="font-display text-xl font-bold">{order.packageName}</p>
        <p className="text-xs text-muted">{packageDetail(order)}</p>
      </div>

      <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
        <p className="text-sm">Total bayar</p>
        <p className="font-display text-3xl font-bold tabular-nums">{formatRupiah(order.price)}</p>
        <p className="mt-1 text-xs text-muted">Tanpa kode unik. Paket aktif otomatis begitu pembayaran masuk.</p>
      </div>

      {qris && (picking || !va) ? (
        <div className="flex flex-col gap-2">
          <Button type="button" disabled={!!pending} onClick={() => make("qris")} className="h-12">
            {pending === "qris" ? "Membuat…" : va ? "Buat kode QRIS baru" : "Tampilkan kode QRIS"}
          </Button>
          <p className="text-xs text-muted">Bisa dibayar dengan GoPay, OVO, DANA, ShopeePay, LinkAja, atau m-banking. Kode berlaku 30 menit.</p>
        </div>
      ) : qris && va ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white px-4 py-4 text-sm text-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
          {va.qr && <img src={va.qr} alt="Kode QRIS pembayaran" className="h-64 w-64" />}
          <p className="font-semibold">Olympus · {formatRupiah(order.price)}</p>
          {va.expiresAt && <p className="text-xs text-slate-500">Berlaku sampai {fmtExpiry(va.expiresAt)} WIB.</p>}
          {va.qr && (
            <a href={va.qr} download="QRIS-Olympus.png" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold">
              ⬇️ Simpan gambar QR
            </a>
          )}
          <ol className="list-decimal self-stretch pl-4 text-xs text-slate-500">
            {QRIS_HOW_TO.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
          <button type="button" className="self-start text-xs font-semibold text-accent" onClick={() => setPicking(true)}>
            Kode kedaluwarsa? Buat kode baru
          </button>
          {va.testQrUrl && (
            <div className="self-stretch rounded-lg border border-dashed border-amber-400 bg-amber-50 p-2 text-xs">
              <p className="font-semibold">Mode uji (sandbox): link gambar QR untuk simulator Midtrans</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono">{va.testQrUrl}</span>
                <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => copy(va.testQrUrl!, "Link QR")}>
                  Salin
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : picking || !va ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Pilih bank untuk virtual account</p>
          <div className="grid grid-cols-2 gap-2">
            {VA_BANKS.map((b) => (
              <Button key={b} type="button" variant="secondary" disabled={!!pending} onClick={() => make(b)} className="h-12">
                {pending === b ? "Membuat…" : VA_BANK_LABEL[b]}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted">Bisa dibayar dari bank lain lewat menu transfer antarbank ke nomor VA.</p>
          {va && (
            <button type="button" className="self-start text-xs font-semibold text-accent" onClick={() => setPicking(false)}>
              Kembali ke nomor VA {VA_BANK_LABEL[va.bank]}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm">
          {va.bank === "mandiri" && va.billerCode && (
            <div className="flex items-center justify-between gap-2">
              <span>
                Kode perusahaan (biller) <span className="font-display text-xl font-bold">{va.billerCode}</span>
              </span>
              <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => copy(va.billerCode!, "Kode biller")}>
                Salin
              </Button>
            </div>
          )}
          <p className="font-semibold">{va.bank === "mandiri" ? "Kode bayar Mandiri" : `Nomor VA ${VA_BANK_LABEL[va.bank]}`}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="break-all font-display text-2xl font-bold tracking-wide">{va.number}</span>
            <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => copy(va.number, "Nomor VA")}>
              Salin
            </Button>
          </div>
          {va.expiresAt && <p className="text-xs text-muted">Bayar sebelum {fmtExpiry(va.expiresAt)} WIB.</p>}
          <ol className="list-decimal pl-4 text-xs text-muted">
            {VA_HOW_TO[va.bank].map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
          <button type="button" className="self-start text-xs font-semibold text-accent" onClick={() => setPicking(true)}>
            Ganti bank
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        {va && !picking && (
          <Button type="button" disabled={!!pending} onClick={() => check()} className="h-12 flex-1">
            {pending === "cek" ? "Mengecek…" : "Saya sudah bayar, cek"}
          </Button>
        )}
        <Button type="button" variant="ghost" disabled={!!pending} onClick={cancel}>
          Batalkan
        </Button>
      </div>
      <p className="text-xs text-muted">Pembayaran dicek otomatis. Kamu dapat notifikasi saat paket aktif.</p>
    </div>
  );
}
