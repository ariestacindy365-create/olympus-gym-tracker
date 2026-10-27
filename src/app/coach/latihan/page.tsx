import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { personalTrainingSchema } from "@/lib/coachPersonalTraining";
import { PersonalTraining } from "@/components/coach/PersonalTraining";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function CoachPersonalTrainingPage() {
  const coach = await requireRole("COACH");
  const today = todayDateKey();
  const [program, exercises, movements, sets, previousDays] = await Promise.all([
    prisma.coachPersonalProgram.findUnique({ where: { coachId: coach.id } }),
    prisma.exercise.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.movement.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, equipment: true } }),
    prisma.setEntry.findMany({
      where: { memberId: coach.id },
      include: { exercise: { select: { name: true } } },
      orderBy: [{ workoutDate: "desc" }, { setNumber: "asc" }],
      take: 500,
    }),
    prisma.setEntry.findMany({
      where: { memberId: coach.id, workoutDate: { lt: today } },
      distinct: ["exerciseId", "unit", "perSide"],
      orderBy: { workoutDate: "desc" },
      select: { exerciseId: true, workoutDate: true, unit: true, perSide: true },
    }),
  ]);
  const previousSets = previousDays.length ? await prisma.setEntry.findMany({
    where: { memberId: coach.id, OR: previousDays },
    orderBy: { setNumber: "asc" },
    select: { exerciseId: true, workoutDate: true, setNumber: true, weight: true, reps: true, unit: true, perSide: true },
  }) : [];
  const parsed = personalTrainingSchema.safeParse({ days: program?.days ?? [] });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Latihan Saya" subtitle="Susun program pribadi dan catat beban setiap set. Tersimpan di akun coach kamu, terpisah dari program kelas." />
      <PersonalTraining
        draftKey={`olympus-personal-program-draft:${coach.id}`}
        initialVersion={program?.updatedAt.toISOString() ?? null}
        exercises={[
          ...exercises.map((exercise) => ({ ...exercise, equipment: movements.find((movement) => movement.name === exercise.name)?.equipment })),
          ...movements.filter((movement) => !exercises.some((exercise) => exercise.name === movement.name))
            .map((movement) => ({ id: `movement:${movement.id}`, name: movement.name, equipment: movement.equipment })),
        ].sort((a, b) => a.name.localeCompare(b.name))}
        initialDays={parsed.success ? parsed.data.days : []}
        today={today.toISOString().slice(0, 10)}
        initialSets={sets.map((set) => ({
          id: set.id, exerciseId: set.exerciseId, exerciseName: set.exercise.name,
          workoutDate: set.workoutDate.toISOString().slice(0, 10), setNumber: set.setNumber,
          weight: set.weight, reps: set.reps, unit: set.unit, perSide: set.perSide, note: set.note, isPR: set.isPR,
        }))}
        previousSets={previousSets.map((set) => ({ ...set, workoutDate: set.workoutDate.toISOString().slice(0, 10) }))}
      />
    </div>
  );
}
