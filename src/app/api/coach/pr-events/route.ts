import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { isBarbellExercise, type PREvent } from "@/lib/barbell";
import { Role } from "@/generated/prisma/client";

// Barbell PRs logged today since `since` (ISO), for the celebration on the
// coach's slideshow. Polled every few seconds while the slideshow is open,
// so it reads only today's PR sets. Without `since` (the slideshow just
// opened) it looks back a few minutes, so a PR logged just before still
// gets its walk. Members hidden from the leaderboard are left out. `now` is
// the next `since`, from the server's clock.
const LOOKBACK_MS = 15 * 60 * 1000;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.COACH) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const now = new Date();
  const sinceRaw = request.nextUrl.searchParams.get("since");
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw) : new Date(now.getTime() - LOOKBACK_MS);

  const sets = await prisma.setEntry.findMany({
    where: {
      workoutDate: todayDateKey(),
      isPR: true,
      unit: "REPS",
      weight: { gt: 0 },
      updatedAt: { gt: since, lte: now },
      member: { role: Role.MEMBER, leaderboardOptOut: false },
    },
    orderBy: { updatedAt: "asc" },
    take: 20,
    select: {
      id: true,
      memberId: true,
      exerciseId: true,
      createdAt: true,
      weight: true,
      reps: true,
      member: { select: { name: true } },
      exercise: { select: { name: true } },
    },
  });

  // The library's equipment column tells "Back Squat" (Barbell) from a goblet one.
  const names = [...new Set(sets.map((s) => s.exercise.name))];
  const movements = names.length
    ? await prisma.movement.findMany({ where: { name: { in: names, mode: "insensitive" } }, select: { name: true, equipment: true } })
    : [];
  const equipment = new Map(movements.map((m) => [m.name.toLowerCase(), m.equipment]));

  const events: PREvent[] = await Promise.all(
    sets
      .filter((s) => isBarbellExercise(s.exercise.name, equipment.get(s.exercise.name.toLowerCase())))
      .map(async (s) => {
        // Heaviest earlier lift on this movement (any earlier day, or earlier today).
        const prior = await prisma.setEntry.aggregate({
          where: { memberId: s.memberId, exerciseId: s.exerciseId, id: { not: s.id }, unit: "REPS", createdAt: { lt: s.createdAt } },
          _max: { weight: true },
        });
        const best = prior._max.weight;
        return {
          id: s.id,
          memberName: s.member.name,
          exercise: s.exercise.name,
          weight: s.weight,
          reps: s.reps,
          delta: best == null ? null : Math.round((s.weight - best) * 10) / 10,
        };
      })
  );

  return NextResponse.json({ events, now: now.toISOString() });
}
