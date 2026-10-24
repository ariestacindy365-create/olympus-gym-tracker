import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { setVolume } from "@/lib/setUnits";
import { Role } from "@/generated/prisma/client";

/** This month's goals: the main one (training days) and two bonus goals. */
export const CHALLENGE = { days: 12, volume: 15000, prs: 3 } as const;

export interface MonthlyChallenge {
  monthLabel: string;
  daysLeft: number;
  mine: { days: number; volume: number; prs: number };
  /** Members who already hit the training-days goal (leaderboard opt-outs left out). */
  finishers: { id: string; name: string }[];
}

export async function getMonthlyChallenge(memberId: string): Promise<MonthlyChallenge> {
  const today = todayDateKey();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  const month = { gte: monthStart, lt: nextMonth };
  // One row per member per training day (not every set), plus this member's
  // own sets for the bonus goals.
  const [dayRows, mySets] = await Promise.all([
    prisma.setEntry.groupBy({ by: ["memberId", "workoutDate"], where: { workoutDate: month, member: { role: Role.MEMBER } } }),
    prisma.setEntry.findMany({
      where: { memberId, workoutDate: month },
      select: { weight: true, reps: true, unit: true, perSide: true, isPR: true },
    }),
  ]);
  const days = new Map<string, number>();
  for (const r of dayRows) days.set(r.memberId, (days.get(r.memberId) ?? 0) + 1);
  const volume = mySets.reduce((a, s) => a + setVolume(s), 0);
  const prs = mySets.filter((s) => s.isPR).length;
  const doneIds = [...days.entries()].filter(([, n]) => n >= CHALLENGE.days).map(([id]) => id);
  const finishers =
    doneIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: doneIds }, leaderboardOptOut: false },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
  return {
    monthLabel: monthStart.toLocaleDateString("id-ID", { month: "long", timeZone: "UTC" }),
    daysLeft: Math.round((nextMonth.getTime() - today.getTime()) / 86_400_000) - 1,
    mine: { days: days.get(memberId) ?? 0, volume: Math.round(volume), prs },
    finishers,
  };
}

/** Months (any so far) in which the member trained on CHALLENGE.days or more days. */
export function challengeMonths(trainingDays: Date[]): number {
  const perMonth = new Map<string, Set<number>>();
  for (const d of trainingDays) {
    const k = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const set = perMonth.get(k) ?? new Set<number>();
    set.add(d.getTime());
    perMonth.set(k, set);
  }
  return [...perMonth.values()].filter((s) => s.size >= CHALLENGE.days).length;
}
