import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgressView, type ExerciseProgress } from "@/components/shared/ProgressView";

export default async function MemberProgressPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const setEntries = await prisma.setEntry.findMany({
    where: { memberId: user.id },
    include: { exercise: true },
    orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
  });

  const byExercise = new Map<string, ExerciseProgress>();
  for (const s of setEntries) {
    let entry = byExercise.get(s.exerciseId);
    if (!entry) {
      entry = { exerciseId: s.exerciseId, exerciseName: s.exercise.name, sessions: [] };
      byExercise.set(s.exerciseId, entry);
    }
    entry.sessions.push({
      id: s.id,
      workoutDate: s.workoutDate.toISOString(),
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      note: s.note,
      isPR: s.isPR,
    });
  }

  const exercises = Array.from(byExercise.values()).sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Progress</h1>
        <p className="text-sm text-muted">Lihat perkembangan beban per gerakan.</p>
      </div>
      <ProgressView exercises={exercises} referenceDate={new Date().toISOString()} />
    </div>
  );
}
