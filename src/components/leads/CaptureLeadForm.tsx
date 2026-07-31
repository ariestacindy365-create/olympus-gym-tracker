"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function CaptureLeadForm() {
  const router = useRouter();
  const [waNumber, setWaNumber] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waNumber, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.existingLeadId) {
          alert(`Nomor ini sudah tercatat sebagai "${data.existingLeadName}". Kamu akan diarahkan ke lead itu untuk follow up ulang.`);
          router.push(`/leads/${data.existingLeadId}`);
          return;
        }
        setError(data.error ?? "Gagal menyimpan lead.");
        return;
      }
      setWaNumber("");
      setName("");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold">Capture Lead Baru</h2>
      <p className="mb-3 text-xs text-muted">Calon klien yang baru DM dari iklan.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="tel"
          placeholder="Nomor WA (mis. 081234567890)"
          value={waNumber}
          onChange={(e) => setWaNumber(e.target.value)}
          required
        />
        <Input
          type="text"
          placeholder="Nama calon klien"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Button type="submit" disabled={pending} className="whitespace-nowrap">
          {pending ? "..." : "+ Capture"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}
