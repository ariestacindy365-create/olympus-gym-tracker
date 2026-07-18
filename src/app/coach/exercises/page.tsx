import { prisma } from "@/lib/prisma";
import { ExerciseManager } from "@/components/coach/ExerciseManager";

export default async function CoachExercisesPage() {
  const exercises = await prisma.exercise.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Kelola Gerakan</h1>
        <p className="text-sm text-muted">Tambah, ubah, atau hapus gerakan yang bisa dipilih member.</p>
      </div>
      <ExerciseManager exercises={exercises} />
    </div>
  );
}
