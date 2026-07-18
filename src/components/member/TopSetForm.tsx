"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LastPerformancePanel } from "@/components/member/LastPerformancePanel";
import { PRCelebrationModal, type PRCelebrationData } from "@/components/member/PRCelebrationModal";

interface ExerciseOption {
  id: string;
  name: string;
}

interface ExistingSet {
  setNumber: number;
  weight: number;
  reps: number;
  note: string | null;
  isPR: boolean;
}

interface LastSet {
  setNumber: number;
  weight: number;
  reps: number;
  workoutDate: string;
}

interface TopSetFormProps {
  exercises: ExerciseOption[];
  defaultExerciseId: string | null;
  todaysSets: Record<string, ExistingSet[]>;
  lastSets: Record<string, LastSet[]>;
  memberName: string;
  onExerciseChange?: (exerciseId: string) => void;
}

export function TopSetForm({
  exercises,
  defaultExerciseId,
  todaysSets,
  lastSets,
  memberName,
  onExerciseChange,
}: TopSetFormProps) {
  const initialExerciseId = defaultExerciseId ?? exercises[0]?.id ?? "";
  const [exerciseId, setExerciseId] = useState(initialExerciseId);
  const [saved, setSaved] = useState(todaysSets);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSavedPR, setJustSavedPR] = useState(false);
  const [celebration, setCelebration] = useState<PRCelebrationData | null>(null);

  function handleExerciseChange(id: string) {
    setExerciseId(id);
    setWeight("");
    setReps("");
    setNote("");
    setJustSavedPR(false);
    setError(null);
    onExerciseChange?.(id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const weightNum = Number(weight);
    const repsNum = Number(reps);
    if (!weightNum || weightNum <= 0 || !repsNum || repsNum <= 0) {
      setError("Isi beban dan reps yang valid.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/member/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, weight: weightNum, reps: repsNum, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan set.");
        return;
      }

      const newSet: ExistingSet = {
        setNumber: data.setEntry.setNumber,
        weight: weightNum,
        reps: repsNum,
        note: note || null,
        isPR: data.setEntry.isPR,
      };
      setSaved((prev) => ({
        ...prev,
        [exerciseId]: [...(prev[exerciseId] ?? []), newSet],
      }));
      setJustSavedPR(newSet.isPR);
      if (newSet.isPR) {
        const exerciseName = exercises.find((ex) => ex.id === exerciseId)?.name ?? "";
        const isDebut = lastExerciseSets.length === 0 && currentSets.length === 0;
        setCelebration({
          memberName,
          exerciseName,
          weight: weightNum,
          reps: repsNum,
          estimated1RM: data.setEntry.estimated1RM,
          isDebut,
        });
      }
      setWeight("");
      setReps("");
      setNote("");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  const currentSets = saved[exerciseId] ?? [];
  const lastExerciseSets = lastSets[exerciseId] ?? [];
  const nextSetNumber = currentSets.length + 1;

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Catat Set</h3>
        {currentSets.length > 0 && (
          <Badge tone={currentSets.some((s) => s.isPR) ? "accent" : "muted"}>
            {currentSets.length} set tercatat
          </Badge>
        )}
      </div>
      <p className="mb-4 text-xs text-muted">Catat beban dan reps untuk tiap set hari ini.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Gerakan</label>
          <Select value={exerciseId} onChange={(e) => handleExerciseChange(e.target.value)}>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </Select>
        </div>

        <LastPerformancePanel lastSets={lastExerciseSets} />

        {currentSets.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {currentSets.map((s) => (
              <div
                key={s.setNumber}
                className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm"
              >
                <span className="text-muted">Set {s.setNumber}</span>
                <div className="flex items-center gap-2">
                  <span>
                    {s.reps} x {s.weight}kg
                  </span>
                  {s.isPR && <Badge tone="accent">PR</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Beban (kg)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
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
          <Input
            type="text"
            placeholder="mis. terasa ringan, form rapi, PR!"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {justSavedPR && <p className="text-sm text-accent">Selamat, ini rekor baru!</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Menyimpan..." : `Log Set ${nextSetNumber}`}
        </Button>
      </form>

      {celebration && <PRCelebrationModal data={celebration} onClose={() => setCelebration(null)} />}
    </Card>
  );
}
