"use client";

import { useState } from "react";
import { TopSetForm } from "@/components/member/TopSetForm";
import { EstimasiBebanTable } from "@/components/member/EstimasiBebanTable";

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

interface PRSummary {
  maxWeight: number | null;
  maxEstimated1RM: number | null;
}

interface DashboardClientProps {
  exercises: ExerciseOption[];
  defaultExerciseId: string | null;
  todaysSets: Record<string, ExistingSet[]>;
  lastSets: Record<string, LastSet[]>;
  personalRecordsByExercise: Record<string, PRSummary>;
}

export function DashboardClient({
  exercises,
  defaultExerciseId,
  todaysSets,
  lastSets,
  personalRecordsByExercise,
}: DashboardClientProps) {
  const [exerciseId, setExerciseId] = useState(defaultExerciseId ?? exercises[0]?.id ?? "");
  const pr = personalRecordsByExercise[exerciseId] ?? { maxWeight: null, maxEstimated1RM: null };

  return (
    <div className="flex flex-col gap-6">
      <TopSetForm
        exercises={exercises}
        defaultExerciseId={defaultExerciseId}
        todaysSets={todaysSets}
        lastSets={lastSets}
        onExerciseChange={setExerciseId}
      />
      <EstimasiBebanTable maxWeight={pr.maxWeight} maxEstimated1RM={pr.maxEstimated1RM} />
    </div>
  );
}
