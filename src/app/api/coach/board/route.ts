import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOnline } from "@/lib/status";
import { todayDateKey } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

export async function GET() {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const [todaysSets, allMembers] = await Promise.all([
    prisma.setEntry.findMany({
      where: { workoutDate: todayDateKey() },
      include: { member: true, exercise: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({ where: { role: Role.MEMBER }, orderBy: { name: "asc" } }),
  ]);

  // Rank by each member's heaviest set of the day per exercise (tie-break by reps).
  const bestByPair = new Map<string, (typeof todaysSets)[number]>();
  for (const s of todaysSets) {
    const key = `${s.memberId}:${s.exerciseId}`;
    const existing = bestByPair.get(key);
    if (!existing || s.weight > existing.weight || (s.weight === existing.weight && s.reps > existing.reps)) {
      bestByPair.set(key, s);
    }
  }
  const bestSets = Array.from(bestByPair.values());

  const exerciseIds = Array.from(new Set(bestSets.map((s) => s.exerciseId)));
  const priorBests =
    exerciseIds.length > 0
      ? await prisma.setEntry.groupBy({
          by: ["memberId", "exerciseId"],
          where: { workoutDate: { lt: todayDateKey() }, exerciseId: { in: exerciseIds } },
          _max: { estimated1RM: true },
        })
      : [];

  const priorBestMap = new Map<string, number>();
  for (const p of priorBests) {
    if (p._max.estimated1RM != null) {
      priorBestMap.set(`${p.memberId}:${p.exerciseId}`, p._max.estimated1RM);
    }
  }

  const rows = bestSets.map((setEntry) => {
    const priorBest = priorBestMap.get(`${setEntry.memberId}:${setEntry.exerciseId}`);
    const isDebut = priorBest === undefined;
    const estimated1RMDelta =
      !isDebut && setEntry.estimated1RM > priorBest! ? setEntry.estimated1RM - priorBest! : null;

    return {
      id: setEntry.id,
      memberId: setEntry.memberId,
      memberName: setEntry.member.name,
      online: isOnline(setEntry.member.lastActiveAt),
      exerciseId: setEntry.exerciseId,
      exerciseName: setEntry.exercise.name,
      weight: setEntry.weight,
      reps: setEntry.reps,
      estimated1RM: setEntry.estimated1RM,
      note: setEntry.note,
      isPR: setEntry.isPR,
      isDebut,
      estimated1RMDelta,
      updatedAt: setEntry.updatedAt.toISOString(),
    };
  });

  const members = allMembers.map((m) => ({
    id: m.id,
    name: m.name,
    online: isOnline(m.lastActiveAt),
  }));

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const prEvents = todaysSets
    .filter((s) => s.isPR && s.updatedAt >= twoMinutesAgo)
    .map((s) => ({
      id: `${s.id}-${s.updatedAt.getTime()}`,
      memberName: s.member.name,
      exerciseName: s.exercise.name,
      weight: s.weight,
      reps: s.reps,
      estimated1RM: s.estimated1RM,
      createdAt: s.updatedAt.toISOString(),
    }));

  return NextResponse.json({ rows, members, prEvents });
}
