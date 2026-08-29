"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PAYMENT_METHOD_LABEL } from "@/lib/packages";

const CUSTOM_PACKAGE = "__CUSTOM__";
const NEW_MEMBER = "__NEW__";

export interface PackageOption {
  name: string;
  price: number;
}

export interface MemberOption {
  id: string;
  name: string;
  waNumber: string;
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RecordPaymentForm({
  members,
  packages,
  initialLeadId,
}: {
  members: MemberOption[];
  packages: PackageOption[];
  initialLeadId?: string;
}) {
  const router = useRouter();
  const [leadId, setLeadId] = useState(initialLeadId ?? members[0]?.id ?? NEW_MEMBER);
  const [newName, setNewName] = useState("");
  const [newWaNumber, setNewWaNumber] = useState("");
  const [preset, setPreset] = useState(packages[0]?.name ?? CUSTOM_PACKAGE);
  const [customName, setCustomName] = useState("");
  const [amount, setAmount] = useState(String(packages[0]?.price ?? ""));
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [paidAt, setPaidAt] = useState(todayInputValue());
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePresetChange(value: string) {
    setPreset(value);
    if (value !== CUSTOM_PACKAGE) {
      const match = packages.find((p) => p.name === value);
      if (match) setAmount(String(match.price));
    }
  }

  // A walk-in who never went through the DM/lead funnel — create them as a
  // Lead (straight to MEMBER, same as "Langsung Jadi Member") first, so the
  // payment/receipt can attach to a real lead like everyone else's.
  async function createWalkInLead(): Promise<string | null> {
    const name = newName.trim();
    const waNumber = newWaNumber.trim();
    if (!name || !waNumber) {
      setError("Isi nama dan nomor WA member baru.");
      return null;
    }

    const createRes = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, waNumber }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      setError(createData.error ?? "Gagal menambahkan member baru.");
      return null;
    }

    const newLeadId = createData.lead.id as string;
    const statusRes = await fetch(`/api/leads/${newLeadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "MEMBER" }),
    });
    if (!statusRes.ok) {
      const statusData = await statusRes.json().catch(() => ({}));
      setError(statusData.error ?? "Gagal menandai sebagai member.");
      return null;
    }

    return newLeadId;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const packageName = preset === CUSTOM_PACKAGE ? customName.trim() : preset;
    const amountNum = Number(amount);
    if (!packageName) {
      setError("Isi nama paket.");
      return;
    }
    if (!amountNum || amountNum <= 0) {
      setError("Isi nominal yang valid.");
      return;
    }

    setPending(true);
    try {
      let targetLeadId = leadId;
      if (leadId === NEW_MEMBER) {
        const created = await createWalkInLead();
        if (!created) return;
        targetLeadId = created;
      }

      const res = await fetch(`/api/leads/${targetLeadId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName, amount: amountNum, paymentMethod, paidAt, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan pembayaran.");
        return;
      }
      router.push(`/leads/${targetLeadId}/receipt/${data.payment.id}`);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold">Catat Pembayaran / Perpanjangan</h2>
      <p className="mb-3 text-xs text-muted">Setelah disimpan, struknya bisa langsung dicetak.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Member</label>
          <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.waNumber}
              </option>
            ))}
            <option value={NEW_MEMBER}>+ Member Baru (Walk-in / belum pernah tercatat)</option>
          </Select>
        </div>
        {leadId === NEW_MEMBER && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
            <p className="text-xs text-muted">
              Member ini akan otomatis dicatat sebagai lead baru dengan status Member.
            </p>
            <Input placeholder="Nama member" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <Input
              type="tel"
              placeholder="Nomor WA (mis. 081234567890)"
              value={newWaNumber}
              onChange={(e) => setNewWaNumber(e.target.value)}
              required
            />
          </div>
        )}
        <Select value={preset} onChange={(e) => handlePresetChange(e.target.value)}>
          {packages.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} — Rp {p.price.toLocaleString("id-ID")}
            </option>
          ))}
          <option value={CUSTOM_PACKAGE}>Paket lain...</option>
        </Select>
        {preset === CUSTOM_PACKAGE && (
          <Input
            placeholder="Nama paket"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            required
          />
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted">Nominal (Rp)</label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted">Tanggal Bayar</label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
          </div>
        </div>
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
        <Input placeholder="Catatan (opsional, mis. diskon promo)" value={note} onChange={(e) => setNote(e.target.value)} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan..." : "Simpan & Cetak Struk"}
        </Button>
      </form>
    </Card>
  );
}
