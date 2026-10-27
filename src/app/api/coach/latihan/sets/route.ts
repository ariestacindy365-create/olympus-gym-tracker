import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimate1RMFor } from "@/lib/oneRepMax";
import { checkAndRecordPR } from "@/lib/pr";
import { todayDateKey } from "@/lib/workout";
import { resolvePersonalExercise } from "@/lib/personalTrainingExercises";
import { setEntrySchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = setEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pilih gerakan dan isi beban & reps yang valid." }, { status: 400 });
  }
  const { weight, reps, unit, perSide, note } = parsed.data;

  const exercise = await resolvePersonalExercise(parsed.data.exerciseId);
  if (!exercise) {
    return NextResponse.json({ error: "Gerakan tidak ditemukan." }, { status: 404 });
  }

  const exerciseId = exercise.id;
  const workoutDate = todayDateKey();
  if (parsed.data.date && parsed.data.date !== workoutDate.toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "Tanggal berganti. Muat ulang halaman untuk mencatat latihan hari ini." }, { status: 400 });
  }
  const estimated1RM = estimate1RMFor(weight, reps, unit);

  const setEntry = await prisma.$transaction(async (tx) => {
    // Serialize saves for this coach so two tabs cannot overwrite one set.
    await tx.$executeRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${user.id}))`;
    const agg = await tx.setEntry.aggregate({
      where: { memberId: user.id, exerciseId, workoutDate },
      _max: { setNumber: true },
    });
    const setNumber = (agg._max.setNumber ?? 0) + 1;
    const saved = await tx.setEntry.create({
      data: { memberId: user.id, exerciseId, workoutDate, setNumber, weight, reps, unit, perSide, estimated1RM, note },
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

  return NextResponse.json({ setEntry, exercise });
}
