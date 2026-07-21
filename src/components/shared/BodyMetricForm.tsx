"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parseWeightInput } from "@/lib/parseWeight";

interface BodyMetricFormProps {
  basePath: string;
  title?: string;
  description?: string;
}

export function BodyMetricForm({
  basePath,
  title = "Catat Berat Badan",
  description = "Berat badan, body fat, dan skeletal muscle mass hari ini.",
}: BodyMetricFormProps) {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const weightNum = parseWeightInput(weight);
    if (!weightNum) {
      setError("Isi berat badan yang valid.");
      return;
    }
    const bodyFatNum = bodyFatPercent.trim() ? parseWeightInput(bodyFatPercent) : null;
    if (bodyFatPercent.trim() && !bodyFatNum) {
      setError("Isi body fat % yang valid.");
      return;
    }
    const muscleNum = skeletalMuscleMass.trim() ? parseWeightInput(skeletalMuscleMass) : null;
    if (skeletalMuscleMass.trim() && !muscleNum) {
      setError("Isi skeletal muscle mass yang valid.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: weightNum,
          bodyFatPercent: bodyFatNum ?? undefined,
          skeletalMuscleMass: muscleNum ?? undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan data.");
        return;
      }
      setWeight("");
      setBodyFatPercent("");
      setSkeletalMuscleMass("");
      setNote("");
      setSaved(true);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted">{description}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Berat Badan (kg)
            </label>
            <Input type="text" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Body Fat (%)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="opsional"
              value={bodyFatPercent}
              onChange={(e) => setBodyFatPercent(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Skeletal Muscle (kg)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="opsional"
              value={skeletalMuscleMass}
              onChange={(e) => setSkeletalMuscleMass(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
            Catatan (opsional)
          </label>
          <Input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && !error && <p className="text-sm text-accent">Tersimpan.</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
      </form>
    </Card>
  );
}
