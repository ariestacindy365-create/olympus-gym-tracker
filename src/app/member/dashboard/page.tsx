import { getCurrentUser } from "@/lib/auth";
import { getTodayDailyWorkout, todayDateKey } from "@/lib/workout";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TopSetForm } from "@/components/member/TopSetForm";

export default async function MemberDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [dailyWorkout, exercises, todaysSets, pastSets, recentPRs] = await Promise.all([
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
    prisma.personalRecord.findMany({
      where: { memberId: user.id },
      orderBy: { achievedAt: "desc" },
      take: 3,
      include: { exercise: true },
    }),
  ]);

  const todaysSetsMap: Record<
    string,
    { setNumber: number; weight: number; reps: number; note: string | null; isPR: boolean }[]
  > = {};
  for (const s of todaysSets) {
    (todaysSetsMap[s.exerciseId] ??= []).push({
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
        <Card>
          <p className="text-muted">Belum ada gerakan yang ditambahkan pelatih. Coba lagi nanti.</p>
        </Card>
      ) : (
        <TopSetForm
          exercises={exercises}
          defaultExerciseId={dailyWorkout?.exerciseId ?? null}
          todaysSets={todaysSetsMap}
          lastSets={lastSetsMap}
        />
      )}

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Rekor Terbaru</h2>
        {recentPRs.length === 0 ? (
          <p className="text-sm text-muted">Belum ada rekor. Ayo mulai catat!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentPRs.map((pr) => (
              <li key={pr.id} className="flex items-center justify-between text-sm">
                <span>{pr.exercise.name}</span>
                <Badge tone="accent">
                  {pr.type === "MAX_WEIGHT" ? `${pr.weight}kg x ${pr.reps}` : `~${pr.estimated1RM.toFixed(1)}kg 1RM`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
