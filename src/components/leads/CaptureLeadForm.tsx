"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { LEAD_SOURCES, SOURCE_LABEL, type LeadSourceValue } from "@/lib/leadStatusLabels";

export function CaptureLeadForm() {
  const router = useRouter();
  const toast = useToast();
  const [waNumber, setWaNumber] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState<LeadSourceValue | null>(null);
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
        body: JSON.stringify({ waNumber, name, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.existingLeadId) {
          toast.error(`Nomor ini sudah tercatat sebagai "${data.existingLeadName}". Kamu akan diarahkan ke lead itu untuk follow up ulang.`);
          router.push(`/leads/${data.existingLeadId}`);
          return;
        }
        setError(data.error ?? "Gagal menyimpan lead.");
        return;
      }
      setWaNumber("");
      setName("");
      setSource(null);
      toast.success("Lead baru dicatat.");
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
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
        </div>
        <div>
          <p className="mb-1.5 text-xs text-muted">Tahu Olympus dari mana? (opsional)</p>
          <div role="radiogroup" aria-label="Sumber lead" className="flex flex-wrap gap-1.5">
            {LEAD_SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                onClick={() => setSource((cur) => (cur === s ? null : s))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  source === s
                    ? "bg-accent text-white"
                    : "border border-border bg-surface-2 text-muted hover:border-border-strong hover:text-foreground"
                }`}
              >
                {SOURCE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={pending} className="whitespace-nowrap sm:self-end">
          {pending ? "..." : "+ Capture"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}
