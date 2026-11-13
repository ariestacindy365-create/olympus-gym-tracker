"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

/** Verify (checklist, then Konfirmasi) or Tolak one pending app purchase. */
export function MemberOrderActions({ orderId, amount, senderName }: { orderId: string; amount: string; senderName: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [arrived, setArrived] = useState(false);
  const [pending, setPending] = useState(false);

  async function send(body: Record<string, unknown>, done: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/membership-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Gagal. Coba lagi.");
        return;
      }
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
  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
        <input type="checkbox" checked={arrived} onChange={(e) => setArrived(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Sudah saya cek: <span className="font-semibold">{amount}</span>
          {senderName && (
            <>
              {" "}
              dari <span className="font-semibold">{senderName}</span>
            </>
          )}{" "}
          sudah masuk ke rekening / QRIS Olympus.
        </span>
      </label>
      <div className="flex gap-2">
        <Button disabled={pending || !arrived} onClick={() => send({ action: "approve", verified: true }, "Terverifikasi, member aktif ✅")}>
          ✓ Konfirmasi
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => setRejecting(true)}>
          Tolak
        </Button>
      </div>
    </div>
  );
}

/** Adds a membership for someone who paid at the front desk. */
export function AddMembershipForm({
  members,
  packages,
}: {
  members: { id: string; name: string; email: string }[];
  packages: { id: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [pending, setPending] = useState(false);
  const q = query.trim().toLowerCase();
  const matches = q ? members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)).slice(0, 6) : [];
  const picked = members.find((m) => m.id === userId);

  async function submit() {
    setPending(true);
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, packageId, startsAt: startsAt || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success(`Member ${picked?.name ?? ""} aktif`);
      setUserId("");
      setQuery("");
      setStartsAt("");
      router.refresh();
    } catch {
      toast.error("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {picked ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <span>
            <span className="font-semibold">{picked.name}</span> <span className="text-muted">{picked.email}</span>
          </span>
          <button type="button" className="text-xs text-accent underline" onClick={() => setUserId("")}>
            Ganti
          </button>
        </div>
      ) : (
        <div>
          <Input placeholder="Ketik nama member" value={query} onChange={(e) => setQuery(e.target.value)} />
          {matches.length > 0 && (
            <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
              {matches.map((m) => (
                <li key={m.id}>
                  <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => setUserId(m.id)}>
                    <span className="font-semibold">{m.name}</span> <span className="text-muted">{m.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          aria-label="Paket"
          value={packageId}
          onChange={(e) => setPackageId(e.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
        >
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          Mulai
          <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-foreground" />
        </label>
      </div>
      <p className="text-xs text-muted">Tanggal mulai kosong = mulai sekarang, atau setelah paketnya yang masih jalan habis.</p>
      <Button disabled={pending || !userId || !packageId} onClick={submit} className="self-start">
        {pending ? "..." : "Aktifkan member"}
      </Button>
    </div>
  );
}
