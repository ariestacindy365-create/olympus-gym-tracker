import { prisma } from "@/lib/prisma";
import { getTodayDailyWorkout } from "@/lib/workout";
import { LiveBoard } from "@/components/coach/LiveBoard";

export default async function CoachBoardPage() {
  const [exercises, dailyWorkout] = await Promise.all([
    prisma.exercise.findMany({ orderBy: { name: "asc" } }),
    getTodayDailyWorkout(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Live Coach Board</h1>
        <p className="text-sm text-muted">Updates automatically every few seconds.</p>
      </div>
      <LiveBoard exercises={exercises} defaultExerciseId={dailyWorkout?.exerciseId ?? null} />
    </div>
  );
}
