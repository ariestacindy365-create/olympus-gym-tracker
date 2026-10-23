import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";
import { setVolume } from "@/lib/setUnits";

export type LeaderboardCategory = "volume" | "days" | "prs";

export interface LeaderboardRow {
  memberId: string;
  name: string;
  value: number;
}

export interface MonthlyLeaderboard {
  monthLabel: string;
  boards: Record<LeaderboardCategory, LeaderboardRow[]>;
}

/**
 * This month's member rankings: total volume (kg), training days and PRs.
 * Date keys are Jakarta-local days stored at UTC midnight (see
 * todayDateKey), so the month bounds use the same convention. Members who
 * opted out are left out entirely; members with no sets this month too.
 */
export async function getMonthlyLeaderboard(): Promise<MonthlyLeaderboard> {
  const today = todayDateKey();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

  const sets = await prisma.setEntry.findMany({
    where: {
      workoutDate: { gte: monthStart, lt: nextMonth },
      member: { role: Role.MEMBER, leaderboardOptOut: false },
    },
    select: { memberId: true, workoutDate: true, weight: true, reps: true, unit: true, isPR: true, member: { select: { name: true } } },
  });

  const stats = new Map<string, { name: string; volume: number; days: Set<number>; prs: number }>();
  for (const s of sets) {
    const st = stats.get(s.memberId) ?? { name: s.member.name, volume: 0, days: new Set<number>(), prs: 0 };
    st.volume += setVolume(s);
    st.days.add(s.workoutDate.getTime());
    if (s.isPR) st.prs += 1;
    stats.set(s.memberId, st);
  }

  const board = (pick: (st: { volume: number; days: Set<number>; prs: number }) => number) =>
    [...stats.entries()]
      .map(([memberId, st]) => ({ memberId, name: st.name, value: Math.round(pick(st) * 10) / 10 }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  return {
    monthLabel: monthStart.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }),
    boards: {
      volume: board((st) => st.volume),
      days: board((st) => st.days.size),
      prs: board((st) => st.prs),
    },
  };
}
