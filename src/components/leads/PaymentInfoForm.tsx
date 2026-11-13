"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { ProofImageUpload } from "@/components/leads/ProofImageUpload";

/** Owner: the account and QRIS members pay to when buying in the app. */
export function PaymentInfoForm({
  initial,
}: {
  initial: { bankName: string; accountNumber: string; accountName: string; qrisImage: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setPending(true);
    try {
      const res = await fetch("/api/payment-info", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success("Info pembayaran disimpan");
      router.refresh();
    } catch {
      toast.error("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <Input placeholder="Bank (mis. BCA)" value={form.bankName} onChange={set("bankName")} />
        <Input placeholder="Nomor rekening" inputMode="numeric" value={form.accountNumber} onChange={set("accountNumber")} />
        <Input placeholder="Atas nama" value={form.accountName} onChange={set("accountName")} />
      </div>
      <ProofImageUpload value={form.qrisImage} onChange={(qrisImage) => setForm({ ...form, qrisImage })} label="Gambar QRIS (opsional)" />
      <Button disabled={pending} onClick={save} className="self-start">
        {pending ? "..." : "Simpan info pembayaran"}
      </Button>
    </div>
  );
}
