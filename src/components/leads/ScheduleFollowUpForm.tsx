"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, addMonths, format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ScheduleFollowUpForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(days?: number, months?: number) {
    const base = new Date();
    const target = months != null ? addMonths(base, months) : addDays(base, days ?? 0);
    setDueDate(format(target, "yyyy-MM-dd"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dueDate) {
      setError("Pilih tanggal follow up.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menjadwalkan follow up.");
        return;
      }
      setDueDate("");
      setNote("");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h3 className="mb-1 font-display text-base font-semibold">Jadwalkan Follow Up Manual</h3>
      <p className="mb-3 text-xs text-muted">
        Misalnya calon klien minta di-follow up lagi minggu depan atau bulan depan.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => applyPreset(7)}>
            + 1 Minggu
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            onClick={() => applyPreset(undefined, 1)}
          >
            + 1 Bulan
          </Button>
        </div>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        <Input
          placeholder="Catatan (opsional, mis. minta di-follow up lagi soal harga)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan..." : "Jadwalkan"}
        </Button>
      </form>
    </Card>
  );
}
