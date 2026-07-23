"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parseWeightInput } from "@/lib/parseWeight";
import {
  BodyMetricCelebrationModal,
  type BodyMetricCelebrationData,
  type BodyMetricWin,
} from "@/components/shared/BodyMetricCelebrationModal";

interface BodyMetricEntryLite {
  id: string;
  recordedDate: string;
  weight: number;
  bodyFatPercent: number | null;
  skeletalMuscleMass: number | null;
  visceralFat: number | null;
}

function findWins(entries: BodyMetricEntryLite[], savedEntryId: string): BodyMetricWin[] {
  const sorted = [...entries].sort((a, b) => a.recordedDate.localeCompare(b.recordedDate));
  const index = sorted.findIndex((e) => e.id === savedEntryId);
  if (index <= 0) return [];
  const current = sorted[index];
  const previous = sorted[index - 1];

  const wins: BodyMetricWin[] = [];
  if (current.weight < previous.weight) {
    wins.push({
      icon: "⬇️",
      label: "Berat Badan Turun",
      detail: `-${(previous.weight - current.weight).toFixed(1)}kg → ${current.weight}kg`,
    });
  }
  if (current.bodyFatPercent != null && previous.bodyFatPercent != null && current.bodyFatPercent < previous.bodyFatPercent) {
    wins.push({
      icon: "⬇️",
      label: "Body Fat Turun",
      detail: `-${(previous.bodyFatPercent - current.bodyFatPercent).toFixed(1)}% → ${current.bodyFatPercent}%`,
    });
  }
  if (
    current.skeletalMuscleMass != null &&
    previous.skeletalMuscleMass != null &&
    current.skeletalMuscleMass > previous.skeletalMuscleMass
  ) {
    wins.push({
      icon: "⬆️",
      label: "Skeletal Muscle Naik",
      detail: `+${(current.skeletalMuscleMass - previous.skeletalMuscleMass).toFixed(1)}kg → ${current.skeletalMuscleMass}kg`,
    });
  }
  if (current.visceralFat != null && previous.visceralFat != null && current.visceralFat < previous.visceralFat) {
    wins.push({
      icon: "⬇️",
      label: "Visceral Fat Turun",
      detail: `-${(previous.visceralFat - current.visceralFat).toFixed(1)} → ${current.visceralFat}`,
    });
  }
  return wins;
}

function todayInputValue() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface BodyMetricFormProps {
  basePath: string;
  memberName: string;
  title?: string;
  description?: string;
  /** Coach backfilling a weigh-in from a day the member didn't have their phone. */
  showDatePicker?: boolean;
}

export function BodyMetricForm({
  basePath,
  memberName,
  title = "Catat Berat Badan",
  description = "Berat badan, body fat, skeletal muscle mass, dan visceral fat hari ini.",
  showDatePicker = false,
}: BodyMetricFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(todayInputValue);
  const [weight, setWeight] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [celebration, setCelebration] = useState<BodyMetricCelebrationData | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (showDatePicker && !date) {
      setError("Pilih tanggal.");
      return;
    }
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
    const visceralFatNum = visceralFat.trim() ? parseWeightInput(visceralFat) : null;
    if (visceralFat.trim() && !visceralFatNum) {
      setError("Isi visceral fat yang valid.");
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
          visceralFat: visceralFatNum ?? undefined,
          note: note || undefined,
          recordedDate: showDatePicker ? date : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan data.");
        return;
      }
      const wins = findWins(data.entries, data.entry.id);
      if (wins.length > 0) {
        setCelebration({ memberName, wins });
      }
      setWeight("");
      setBodyFatPercent("");
      setSkeletalMuscleMass("");
      setVisceralFat("");
      setNote("");
      setDate(todayInputValue());
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
        {showDatePicker && (
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Tanggal Timbang
            </label>
            <Input
              type="date"
              value={date}
              max={todayInputValue()}
              onChange={(e) => setDate(e.target.value)}
              className="max-w-xs"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Visceral Fat
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="opsional"
              value={visceralFat}
              onChange={(e) => setVisceralFat(e.target.value)}
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

      {celebration && <BodyMetricCelebrationModal data={celebration} onClose={() => setCelebration(null)} />}
    </Card>
  );
}
