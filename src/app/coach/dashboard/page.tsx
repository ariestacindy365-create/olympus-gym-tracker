import { prisma } from "@/lib/prisma";
import { isOnline } from "@/lib/status";
import { getTodayDailyWorkout, todayDateKey } from "@/lib/workout";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { DailyWorkoutForm } from "@/components/coach/DailyWorkoutForm";
import { Role } from "@/generated/prisma/client";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { todayLabel } from "@/lib/dateLabel";

export default async function CoachDashboardPage() {
  const [coach, members, exercises, dailyWorkout, todaysSets, recentPRs] = await Promise.all([
    getCurrentUser(),
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
      <PageHeader
        eyebrow={todayLabel()}
        title={coach ? `Halo, ${/^coach\b/i.test(coach.name) ? coach.name : `Coach ${coach.name}`}` : "Coach Dashboard"}
        subtitle="Atur gerakan hari ini dan pantau member yang sedang latihan."
        actions={
          <Link
            href="/coach/board"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/25 transition hover:bg-accent-2"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" aria-hidden />
            Buka Live Board
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile label="Total Member" value={members.length} />
        <StatTile label="Online" value={onlineCount} accent />
        <StatTile
          label="Sudah Catat"
          value={`${loggedMemberIds.size}/${members.length}`}
          accent
          progress={{ current: loggedMemberIds.size, target: members.length }}
        />
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
              <li key={pr.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{pr.member.name}</span>{" "}
                  <span className="text-muted">- {pr.exercise.name}</span>
                </span>
                <span className="tabular shrink-0 font-semibold text-accent">
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
