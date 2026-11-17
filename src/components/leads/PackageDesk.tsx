"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { formatRupiah } from "@/lib/packages";

/** Verify (checklist, then Konfirmasi) or Tolak one pending app purchase. */
export function OrderReview({ orderId, amount, senderName }: { orderId: string; amount: string; senderName: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [checks, setChecks] = useState({ amount: false, sender: false, proof: false });
  const [pending, setPending] = useState(false);

  async function send(body: Record<string, unknown>, done: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/membership-orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Gagal. Coba lagi.");
      toast.success(done);
      router.refresh();
    } catch {
      toast.error("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  if (rejecting) {
    return (
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Input placeholder="Alasan ditolak (dikirim ke member)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="danger" disabled={pending || !reason.trim()} onClick={() => send({ action: "reject", reason }, "Pembelian ditolak")}>
          Tolak
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setRejecting(false)}>
          Batal
        </Button>
      </div>
    );
  }
  const all = checks.amount && checks.sender && checks.proof;
  const item = (k: keyof typeof checks, text: React.ReactNode) => (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
      <span>{text}</span>
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Cek di mutasi rekening</p>
        {item("amount", <>Ada transfer masuk persis <span className="font-semibold">{amount}</span></>)}
        {item("sender", <>Nama pengirim cocok{senderName ? <>: <span className="font-semibold">{senderName}</span></> : ""}</>)}
        {item("proof", "Bukti transfer jelas dan sesuai")}
      </div>
      <div className="flex gap-2">
        <Button disabled={pending || !all} onClick={() => send({ action: "approve", verified: true }, "Terverifikasi, paket aktif ✅")} className="flex-1">
          ✓ Konfirmasi
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => setRejecting(true)}>
          Tolak
        </Button>
      </div>
    </div>
  );
}

const METHODS = [
  { id: "TUNAI", label: "Tunai" },
  { id: "DEBIT", label: "Kartu debit" },
  { id: "KARTU_KREDIT", label: "Kartu kredit" },
  { id: "QRIS", label: "QRIS" },
  { id: "TRANSFER", label: "Transfer" },
] as const;

/** A member pays at the front desk: pick the member, the package and how they paid. */
export function DeskSale({ packages }: { packages: { id: string; name: string; price: number; category: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ id: string; name: string }[]>([]);
  const [member, setMember] = useState<{ id: string; name: string } | null>(null);
  const [packageId, setPackageId] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"] | "">("");
  const [wa, setWa] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ text: string; leadId: string; paymentId: string } | null>(null);
  const pkg = packages.find((p) => p.id === packageId);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) return setFound([]);
    const res = await fetch(`/api/bookings/members?q=${encodeURIComponent(q.trim())}`).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setFound(data?.members ?? []);
  }

  async function submit() {
    if (!member || !pkg || !method) return;
    setPending(true);
    try {
      const res = await fetch("/api/memberships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: member.id, packageId: pkg.id, paymentMethod: method, waNumber: wa }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Gagal menyimpan.");
      setDone({ text: `${member.name}: ${pkg.name} aktif · ${formatRupiah(pkg.price)} (${METHODS.find((m) => m.id === method)?.label})`, leadId: data.leadId, paymentId: data.paymentId });
      setMember(null);
      setQuery("");
      setFound([]);
      setPackageId("");
      setMethod("");
      setWa("");
      router.refresh();
    } catch {
      toast.error("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  const categories = [...new Set(packages.map((p) => p.category))];
  return (
    <div className="flex flex-col gap-3">
      {done && (
        <p role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm">
          ✓ {done.text}
          <Link href={`/leads/${done.leadId}/receipt/${done.paymentId}`} className="font-semibold text-accent">
            Cetak struk
          </Link>
        </p>
      )}
      {member ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <span className="font-semibold">{member.name}</span>
          <button type="button" className="min-h-9 text-xs font-semibold text-accent" onClick={() => setMember(null)}>
            Ganti
          </button>
        </div>
      ) : (
        <div>
          <Input placeholder="Ketik nama member" aria-label="Cari member" value={query} onChange={(e) => void search(e.target.value)} />
          {found.length > 0 && (
            <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
              {found.map((m) => (
                <li key={m.id}>
                  <button type="button" className="min-h-11 w-full px-3 text-left text-sm hover:bg-surface-2" onClick={() => setMember(m)}>
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-muted">Member harus sudah punya akun di aplikasi (daftar di HP-nya dulu).</p>
        </div>
      )}
      <select aria-label="Paket" value={packageId} onChange={(e) => setPackageId(e.target.value)} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm">
        <option value="">Pilih paket…</option>
        {categories.map((c) => (
          <optgroup key={c} label={c}>
            {packages
              .filter((p) => p.category === c)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatRupiah(p.price)}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <div role="radiogroup" aria-label="Cara bayar" className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {METHODS.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)} className={`min-h-11 rounded-lg border px-2 text-sm font-semibold ${method === m.id ? "border-accent bg-accent text-white" : "border-border bg-surface"}`}>
            {m.label}
          </button>
        ))}
      </div>
      <Input placeholder="Nomor WhatsApp (opsional)" inputMode="tel" aria-label="Nomor WhatsApp" value={wa} onChange={(e) => setWa(e.target.value)} />
      <Button disabled={pending || !member || !pkg || !method} onClick={submit} className="h-12">
        {pending ? "Menyimpan…" : pkg ? `Terima ${formatRupiah(pkg.price)} & aktifkan` : "Aktifkan paket"}
      </Button>
      <p className="text-xs text-muted">Paket langsung aktif, pembayaran tercatat di laporan dan bisa dicetak struknya.</p>
    </div>
  );
}

/** Owner: the bank account members transfer to. */
export function BankInfoForm({ initial }: { initial: { bankName: string; accountNumber: string; accountName: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [pending, setPending] = useState(false);
  async function save() {
    setPending(true);
    const res = await fetch("/api/payment-info", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setPending(false);
    if (!res?.ok) return toast.error(data?.error ?? "Gagal menyimpan.");
    toast.success("Rekening disimpan");
    router.refresh();
  }
  return (
    <div className="flex flex-col gap-2">
      <Input aria-label="Bank" placeholder="Bank (mis. BCA)" value={v.bankName} onChange={(e) => setV({ ...v, bankName: e.target.value })} />
      <Input aria-label="Nomor rekening" placeholder="Nomor rekening" inputMode="numeric" value={v.accountNumber} onChange={(e) => setV({ ...v, accountNumber: e.target.value })} />
      <Input aria-label="Atas nama" placeholder="Atas nama" value={v.accountName} onChange={(e) => setV({ ...v, accountName: e.target.value })} />
      <Button disabled={pending} onClick={save} className="self-start">
        {pending ? "Menyimpan…" : "Simpan rekening"}
      </Button>
    </div>
  );
}
