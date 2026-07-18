import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { epley1RM } from "@/lib/oneRepMax";
import { checkAndRecordPR } from "@/lib/pr";
import { todayDateKey } from "@/lib/workout";
import { setEntrySchema } from "@/lib/validation";
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
  const { exerciseId, weight, reps, note } = parsed.data;

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) {
    return NextResponse.json({ error: "Gerakan tidak ditemukan." }, { status: 404 });
  }

  const estimated1RM = epley1RM(weight, reps);
  const workoutDate = todayDateKey();

  const setEntry = await prisma.$transaction(async (tx) => {
    const setNumber =
      parsed.data.setNumber ??
      (await tx.setEntry.count({ where: { memberId: user.id, exerciseId, workoutDate } })) + 1;

    const saved = await tx.setEntry.upsert({
      where: { memberId_exerciseId_workoutDate_setNumber: { memberId: user.id, exerciseId, workoutDate, setNumber } },
      create: { memberId: user.id, exerciseId, workoutDate, setNumber, weight, reps, estimated1RM, note },
      update: { weight, reps, estimated1RM, note },
    });

    const isPR = await checkAndRecordPR(tx, {
      memberId: user.id,
      exerciseId,
      weight,
      reps,
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
