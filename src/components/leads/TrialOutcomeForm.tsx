"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function TrialOutcomeForm({ trialId, endDateLabel }: { trialId: string; endDateLabel: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(converted: boolean) {
    setPending(converted ? "yes" : "no");
    setError(null);
    try {
      const res = await fetch(`/api/trials/${trialId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ converted, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan.");
        return;
      }
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <h3 className="mb-1 font-display text-base font-semibold">Trial Selesai ({endDateLabel})</h3>
      <p className="mb-3 text-xs text-muted">
        Konversi di hari yang sama dengan tanggal selesai trial otomatis dapat diskon. Kalau belum konversi, follow up
        H+1 &amp; H+3 akan dibuat otomatis.
      </p>
      <div className="flex flex-col gap-2">
        <Input placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={pending !== null} onClick={() => submit(true)}>
            {pending === "yes" ? "..." : "Konversi Jadi Member"}
          </Button>
          <Button variant="secondary" disabled={pending !== null} onClick={() => submit(false)}>
            {pending === "no" ? "..." : "Belum Konversi"}
          </Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Card>
  );
}
