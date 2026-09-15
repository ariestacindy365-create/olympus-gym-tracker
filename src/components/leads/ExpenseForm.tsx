"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ProofImageUpload } from "@/components/leads/ProofImageUpload";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/packages";

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ExpenseForm() {
  const router = useRouter();
  const [category, setCategory] = useState("SEWA");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayInputValue());
  const [description, setDescription] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Isi nominal yang valid.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: amountNum,
          paidAt,
          proofImage: proofImage || undefined,
          description: description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan pengeluaran.");
        return;
      }
      setAmount("");
      setDescription("");
      setProofImage(null);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold">Catat Pengeluaran</h2>
      <p className="mb-3 text-xs text-muted">Sewa, gaji, alat, dan biaya operasional lainnya.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Kategori</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
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
            <label className="mb-1 block text-xs text-muted">Tanggal</label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
          </div>
        </div>
        <ProofImageUpload value={proofImage} onChange={setProofImage} label="Bukti/Nota (opsional)" />
        <Input
          placeholder="Keterangan (opsional, mis. sewa bulan September)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan..." : "Simpan Pengeluaran"}
        </Button>
      </form>
    </Card>
  );
}
