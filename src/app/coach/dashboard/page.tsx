import { prisma } from "@/lib/prisma";
import { isOnline } from "@/lib/status";
import { getTodayDailyWorkout, todayDateKey } from "@/lib/workout";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { DailyWorkoutForm } from "@/components/coach/DailyWorkoutForm";
import { Role } from "@/generated/prisma/client";

export default async function CoachDashboardPage() {
  const [members, exercises, dailyWorkout, todaysSets, recentPRs] = await Promise.all([
    prisma.user.findMany({ where: { role: Role.MEMBER } }),
    prisma.exercise.findMany({ orderBy: { name: "asc" } }),
    getTodayDailyWorkout(),
    prisma.setEntry.findMany({
      where: { workoutDate: todayDateKey() },
      select: { memberId: true },
    }),
    prisma.personalRecord.findMany({
      orderBy: { achievedAt: "desc" },
      take: 5,
      include: { member: { select: { name: true } }, exercise: true },
    }),
  ]);

  const loggedMemberIds = new Set(todaysSets.map((t) => t.memberId));
  const onlineCount = members.filter((m) => isOnline(m.lastActiveAt)).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Coach Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total Member" value={members.length} />
        <StatTile label="Online" value={onlineCount} accent />
        <StatTile label="Sudah Catat" value={loggedMemberIds.size} accent />
        <StatTile label="Belum Catat" value={members.length - loggedMemberIds.size} />
      </div>

      <DailyWorkoutForm exercises={exercises} currentExerciseId={dailyWorkout?.exerciseId ?? null} />

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Rekor Terbaru Klub</h2>
        {recentPRs.length === 0 ? (
          <p className="text-sm text-muted">Belum ada rekor yang tercatat.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentPRs.map((pr) => (
              <li key={pr.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium">{pr.member.name}</span>{" "}
                  <span className="text-muted">- {pr.exercise.name}</span>
                </span>
                <span className="text-accent">
                  {pr.type === "MAX_WEIGHT" ? `${pr.weight}kg x ${pr.reps}` : `~${pr.estimated1RM.toFixed(1)}kg 1RM`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
