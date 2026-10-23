import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimate1RMFor } from "@/lib/oneRepMax";
import { checkAndRecordPR } from "@/lib/pr";
import { BACKFILL_DAYS, loggableDateKey, todayDateKey } from "@/lib/workout";
import { invalidatePriorBests } from "@/lib/priorBests";
import { setEntrySchema } from "@/lib/validation";
import { syncMemberAchievements } from "@/lib/achievements";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = setEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pilih gerakan dan isi beban & reps yang valid." }, { status: 400 });
  }
  const { exerciseId, weight, reps, unit, perSide, note } = parsed.data;

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) {
    return NextResponse.json({ error: "Gerakan tidak ditemukan." }, { status: 404 });
  }

  const workoutDate = loggableDateKey(parsed.data.date);
  if (!workoutDate) {
    return NextResponse.json({ error: `Latihan hanya bisa diisi sampai ${BACKFILL_DAYS} hari ke belakang.` }, { status: 400 });
  }
  const estimated1RM = estimate1RMFor(weight, reps, unit);

  const setEntry = await prisma.$transaction(async (tx) => {
    let setNumber = parsed.data.setNumber;
    if (setNumber === undefined) {
      // MAX(setNumber), not COUNT — a prior set may have been deleted,
      // leaving a gap that COUNT would collide with.
      const agg = await tx.setEntry.aggregate({
        where: { memberId: user.id, exerciseId, workoutDate },
        _max: { setNumber: true },
      });
      setNumber = (agg._max.setNumber ?? 0) + 1;
    }

    const saved = await tx.setEntry.upsert({
      where: { memberId_exerciseId_workoutDate_setNumber: { memberId: user.id, exerciseId, workoutDate, setNumber } },
      create: { memberId: user.id, exerciseId, workoutDate, setNumber, weight, reps, unit, perSide, estimated1RM, note },
      update: { weight, reps, unit, perSide, estimated1RM, note },
    });

    const isPR = await checkAndRecordPR(tx, {
      memberId: user.id,
      exerciseId,
      weight,
      reps,
      unit,
      estimated1RM,
      setEntryId: saved.id,
    });

    if (isPR !== saved.isPR) {
      return tx.setEntry.update({ where: { id: saved.id }, data: { isPR } });
    }
    return saved;
  });

  // A set on a past day can change the Live Board's "previous best".
  if (workoutDate < todayDateKey()) invalidatePriorBests();
  const newAchievements = await syncMemberAchievements(user.id);

  return NextResponse.json({ setEntry, exercise, newAchievements });
}
