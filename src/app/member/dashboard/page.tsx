import { getCurrentUser } from "@/lib/auth";
import { getTodayDailyWorkout, todayDateKey } from "@/lib/workout";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/member/DashboardClient";
import { ProgressView, type ExerciseProgress } from "@/components/shared/ProgressView";

export default async function MemberDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [dailyWorkout, exercises, todaysSets, pastSets, personalRecords, allSets] = await Promise.all([
    getTodayDailyWorkout(),
    prisma.exercise.findMany({ orderBy: { name: "asc" } }),
    prisma.setEntry.findMany({
      where: { memberId: user.id, workoutDate: todayDateKey() },
      orderBy: { setNumber: "asc" },
    }),
    prisma.setEntry.findMany({
      where: { memberId: user.id, workoutDate: { lt: todayDateKey() } },
      orderBy: [{ workoutDate: "desc" }, { setNumber: "asc" }],
    }),
    prisma.personalRecord.findMany({ where: { memberId: user.id } }),
    prisma.setEntry.findMany({
      where: { memberId: user.id },
      include: { exercise: true },
      orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
    }),
  ]);

  const todaysSetsMap: Record<
    string,
    { id: string; setNumber: number; weight: number; reps: number; note: string | null; isPR: boolean }[]
  > = {};
  for (const s of todaysSets) {
    (todaysSetsMap[s.exerciseId] ??= []).push({
      id: s.id,
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      note: s.note,
      isPR: s.isPR,
    });
  }

  // pastSets is ordered most-recent-day-first; the first day seen per
  // exercise is that exercise's most recent prior session.
  const lastDateByExercise: Record<string, number> = {};
  const lastSetsMap: Record<string, { setNumber: number; weight: number; reps: number; workoutDate: string }[]> = {};
  for (const s of pastSets) {
    const ts = s.workoutDate.getTime();
    if (lastDateByExercise[s.exerciseId] === undefined) {
      lastDateByExercise[s.exerciseId] = ts;
    }
    if (lastDateByExercise[s.exerciseId] === ts) {
      (lastSetsMap[s.exerciseId] ??= []).push({
        setNumber: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        workoutDate: s.workoutDate.toISOString(),
      });
    }
  }

  const personalRecordsByExercise: Record<string, { maxWeight: number | null; maxEstimated1RM: number | null }> = {};
  for (const pr of personalRecords) {
    const entry = (personalRecordsByExercise[pr.exerciseId] ??= { maxWeight: null, maxEstimated1RM: null });
    if (pr.type === "MAX_WEIGHT") entry.maxWeight = pr.weight;
    if (pr.type === "MAX_1RM") entry.maxEstimated1RM = pr.estimated1RM;
  }

  // Collapse to one point per exercise+day using that day's heaviest set
  // (ties broken by higher reps) — every individual set is still stored,
  // this view just charts the day's best like before.
  const bestByDay = new Map<string, (typeof allSets)[number]>();
  for (const s of allSets) {
    const key = `${s.exerciseId}|${s.workoutDate.getTime()}`;
    const existing = bestByDay.get(key);
    if (!existing || s.weight > existing.weight || (s.weight === existing.weight && s.reps > existing.reps)) {
      bestByDay.set(key, s);
    }
  }
  const dayRows = Array.from(bestByDay.values()).sort((a, b) => a.workoutDate.getTime() - b.workoutDate.getTime());

  const byExercise = new Map<string, ExerciseProgress>();
  for (const s of dayRows) {
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
  const progressExercises = Array.from(byExercise.values()).sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Halo, {user.name}</h1>
        <p className="text-sm text-muted">Berikut latihan hari ini.</p>
      </div>

      {dailyWorkout && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 p-4">
          <span className="text-xl">🎯</span>
          <p className="text-sm">
            <span className="text-muted">Gerakan hari ini dari pelatih: </span>
            <span className="font-semibold text-accent">{dailyWorkout.exercise.name}</span>
          </p>
        </div>
      )}

      {exercises.length === 0 ? (
        <p className="text-muted">Belum ada gerakan yang ditambahkan pelatih. Coba lagi nanti.</p>
      ) : (
        <DashboardClient
          exercises={exercises}
          defaultExerciseId={dailyWorkout?.exerciseId ?? null}
          todaysSets={todaysSetsMap}
          lastSets={lastSetsMap}
          personalRecordsByExercise={personalRecordsByExercise}
          memberName={user.name}
        />
      )}

      <ProgressView exercises={progressExercises} referenceDate={new Date().toISOString()} />
    </div>
  );
}
