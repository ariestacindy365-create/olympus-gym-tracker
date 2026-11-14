import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BACKFILL_DAYS, loggableDateKey } from "@/lib/workout";
import { workoutDurationSchema } from "@/lib/workoutDuration";
import { summarizeDay } from "@/lib/workoutSummary";
import { mondayOf } from "@/lib/programRotation";
import { Role, WorkoutVisibility } from "@/generated/prisma/client";
import { setVolume } from "@/lib/setUnits";

const saveSchema = z.object({
  title: z.string().trim().min(1).max(80),
  note: z.string().trim().max(500).optional(),
  visibility: z.enum(["ALL", "COACH", "PRIVATE"]),
  classLabel: z.string().trim().max(80).optional(),
  // Explicit duration for today or a backfill, defaulting to a one-hour session.
  date: z.string().max(10).optional(),
  durationMin: workoutDurationSchema,
});

// "Simpan latihan": records today's workout for the feed (one per day —
// saving again updates it) and returns the numbers for the "Kerja bagus!" cards.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Isi judul dan durasi latihan 10–120 menit yang valid." }, { status: 400 });
  }
  const workoutDate = loggableDateKey(parsed.data.date);
  if (!workoutDate) {
    return NextResponse.json({ error: `Latihan hanya bisa diisi sampai ${BACKFILL_DAYS} hari ke belakang.` }, { status: 400 });
  }
  const summary = await summarizeDay(user.id, workoutDate);
  if (summary.totalSets === 0) {
    return NextResponse.json({ error: "Belum ada set yang dicatat di hari itu." }, { status: 400 });
  }
  summary.durationSec = parsed.data.durationMin * 60;
  const visibility = WorkoutVisibility[parsed.data.visibility];
  const data = {
    title: parsed.data.title,
    note: parsed.data.note || null,
    classLabel: parsed.data.classLabel || null,
    durationSec: summary.durationSec,
    durationManual: true,
    totalVolume: summary.totalVolume,
    totalSets: summary.totalSets,
    prCount: summary.prCount,
    programRounds: summary.rounds,
    visibility,
  };
  const workout = await prisma.workout.upsert({
    where: { memberId_workoutDate: { memberId: user.id, workoutDate } },
    create: { memberId: user.id, workoutDate, ...data },
    update: data,
  });

  const key = new Date(workoutDate.getUTCFullYear(), workoutDate.getUTCMonth(), workoutDate.getUTCDate());
  const monday = mondayOf(key);
  const weekStart = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const [trainingDays, totals, weekDays] = await Promise.all([
    prisma.setEntry.groupBy({ by: ["workoutDate"], where: { memberId: user.id } }),
    prisma.workout.aggregate({ where: { memberId: user.id }, _sum: { durationSec: true } }),
    prisma.setEntry.groupBy({ by: ["workoutDate"], where: { memberId: user.id, workoutDate: { gte: weekStart } } }),
  ]);
  const allSets = await prisma.setEntry.findMany({ where: { memberId: user.id }, select: { weight: true, reps: true, unit: true, perSide: true } });

  // "Rekor baru" card: each record set today against the best before today.
  const prSets = await prisma.setEntry.findMany({
    where: { memberId: user.id, workoutDate, isPR: true },
    select: { exerciseId: true, weight: true, reps: true, exercise: { select: { name: true } } },
    orderBy: { weight: "desc" },
  });
  const prExercises = [...new Map(prSets.map((s) => [s.exerciseId, s])).values()];
  const before = await prisma.setEntry.groupBy({
    by: ["exerciseId"],
    where: { memberId: user.id, exerciseId: { in: prExercises.map((s) => s.exerciseId) }, workoutDate: { lt: workoutDate } },
    _max: { weight: true },
  });
  const beforeOf = new Map(before.map((b) => [b.exerciseId, b._max.weight]));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400_000);

  return NextResponse.json({
    workout,
    summary,
    totals: {
      workoutNumber: trainingDays.length,
      durationSec: totals._sum.durationSec ?? 0,
      totalKg: Math.round(allSets.reduce((a, s) => a + setVolume(s), 0)),
      daysThisWeek: weekDays.length,
      /** Days trained this week, 0 = Monday … 6 = Sunday. */
      weekDays: weekDays
        .filter((d) => d.workoutDate < weekEnd)
        .map((d) => Math.round((d.workoutDate.getTime() - weekStart.getTime()) / 86400_000)),
      records: prExercises.map((s) => ({ exercise: s.exercise.name, weight: s.weight, reps: s.reps, previous: beforeOf.get(s.exerciseId) ?? null })),
    },
  });
}
