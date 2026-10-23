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
  const sets = await prisma.setEntry.findMany({
    where: { workoutDate: { gte: monthStart, lt: nextMonth }, member: { role: Role.MEMBER } },
    select: {
      memberId: true,
      workoutDate: true,
      weight: true,
      reps: true,
      unit: true,
      perSide: true,
      isPR: true,
      member: { select: { name: true, leaderboardOptOut: true } },
    },
  });
  const days = new Map<string, Set<number>>();
  let volume = 0;
  let prs = 0;
  for (const s of sets) {
    const d = days.get(s.memberId) ?? new Set<number>();
    d.add(s.workoutDate.getTime());
    days.set(s.memberId, d);
    if (s.memberId === memberId) {
      volume += setVolume(s);
      if (s.isPR) prs += 1;
    }
  }
  const names = new Map(sets.map((s) => [s.memberId, s.member]));
  const finishers = [...days.entries()]
    .filter(([id, d]) => d.size >= CHALLENGE.days && !names.get(id)!.leaderboardOptOut)
    .map(([id]) => ({ id, name: names.get(id)!.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    monthLabel: monthStart.toLocaleDateString("id-ID", { month: "long", timeZone: "UTC" }),
    daysLeft: Math.round((nextMonth.getTime() - today.getTime()) / 86_400_000) - 1,
    mine: { days: days.get(memberId)?.size ?? 0, volume: Math.round(volume), prs },
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
