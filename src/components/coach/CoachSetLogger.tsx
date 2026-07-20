"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { parseWeightInput } from "@/lib/parseWeight";

interface ExerciseOption {
  id: string;
  name: string;
}

interface CoachSetLoggerProps {
  memberId: string;
  exercises: ExerciseOption[];
}

export function CoachSetLogger({ memberId, exercises }: CoachSetLoggerProps) {
  const router = useRouter();
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const weightNum = parseWeightInput(weight);
    const repsNum = Number(reps);
    if (!exerciseId || !weightNum || !repsNum || repsNum <= 0) {
      setError("Pilih gerakan dan isi beban & reps yang valid.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/coach/members/${memberId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, weight: weightNum, reps: repsNum, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mencatat set.");
        return;
      }
      setWeight("");
      setReps("");
      setNote("");
      setSaved(true);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  if (exercises.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold">Catat Set untuk Member</h2>
      <p className="mb-4 text-xs text-muted">Buat coach input langsung kalau member nggak pegang HP.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Gerakan</label>
          <Select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Beban (kg)
            </label>
            <Input type="text" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Reps</label>
            <Input type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
            Catatan (opsional)
          </label>
          <Input type="text" placeholder="mis. dibantu spot" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && !error && <p className="text-sm text-accent">Set tersimpan.</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Menyimpan..." : "Catat Set"}
        </Button>
      </form>
    </Card>
  );
}
