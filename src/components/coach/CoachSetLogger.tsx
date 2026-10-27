"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { SetFields } from "@/components/shared/SetFields";
import { isNoWeightExercise } from "@/lib/bodyweight";
import { UNIT_MAX, type SetUnit } from "@/lib/setUnits";
import { parseLiftWeight } from "@/lib/parseWeight";

interface ExerciseOption {
  id: string;
  name: string;
  equipment?: string | null;
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
  const [unit, setUnit] = useState<SetUnit>("REPS");
  const [perSide, setPerSide] = useState(false);
  const [kgOpen, setKgOpen] = useState(false);
  const selectedExercise = exercises.find((exercise) => exercise.id === exerciseId);
  const showWeight = kgOpen || !isNoWeightExercise(selectedExercise?.name ?? "", selectedExercise?.equipment);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const weightNum = showWeight ? parseLiftWeight(weight) : 0;
    const repsNum = Number(reps);
    if (!exerciseId || weightNum === null || !Number.isInteger(repsNum) || repsNum <= 0 || repsNum > UNIT_MAX[unit]) {
      setError("Pilih gerakan dan isi beban serta jumlah sesuai satuannya.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/coach/members/${memberId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, weight: weightNum, reps: repsNum, unit, perSide, note: note || undefined }),
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
          <Select disabled={pending} value={exerciseId} onChange={(e) => { setExerciseId(e.target.value); setWeight(""); setKgOpen(false); }}>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </Select>
        </div>

        <SetFields weight={weight} amount={reps} unit={unit} perSide={perSide} showWeight={showWeight} disabled={pending} onWeight={setWeight} onAmount={setReps} onUnit={setUnit} onPerSide={setPerSide} onOpenWeight={() => setKgOpen(true)} />

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
            Catatan (opsional)
          </label>
          <Input disabled={pending} type="text" placeholder="mis. dibantu spot" value={note} onChange={(e) => setNote(e.target.value)} />
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
