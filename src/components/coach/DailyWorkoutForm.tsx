"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface ExerciseOption {
  id: string;
  name: string;
}

interface DailyWorkoutFormProps {
  exercises: ExerciseOption[];
  currentExerciseId: string | null;
}

export function DailyWorkoutForm({ exercises, currentExerciseId }: DailyWorkoutFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "new">("select");
  const [exerciseId, setExerciseId] = useState(currentExerciseId ?? exercises[0]?.id ?? "");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "new" && newExerciseName.trim().length < 2) {
      setError("Nama gerakan minimal 2 karakter.");
      return;
    }
    if (mode === "select" && !exerciseId) {
      setError("Pilih gerakan.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/coach/daily-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "new" ? { newExerciseName: newExerciseName.trim() } : { exerciseId }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan gerakan hari ini.");
        return;
      }

      setMode("select");
      setNewExerciseName("");
      setExerciseId(data.exercise.id);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold">Set Gerakan Hari Ini</h2>
      <p className="mb-4 text-xs text-muted">Berlaku untuk semua member hari ini.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("select")}
            className={`rounded-md px-3 py-1.5 font-medium ${mode === "select" ? "bg-accent text-background" : "bg-surface-2 text-muted"}`}
          >
            Pilih dari daftar
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`rounded-md px-3 py-1.5 font-medium ${mode === "new" ? "bg-accent text-background" : "bg-surface-2 text-muted"}`}
          >
            Tambah gerakan baru
          </button>
        </div>

        {mode === "select" ? (
          <Select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            type="text"
            placeholder="mis. Bulgarian Split Squat"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
          />
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
      </form>
    </Card>
  );
}
