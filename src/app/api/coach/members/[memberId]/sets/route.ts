import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { epley1RM } from "@/lib/oneRepMax";
import { checkAndRecordPR } from "@/lib/pr";
import { todayDateKey } from "@/lib/workout";
import { setEntrySchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/coach/members/[memberId]/sets">) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId } = await ctx.params;
  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
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
    let setNumber = parsed.data.setNumber;
    if (setNumber === undefined) {
      // MAX(setNumber), not COUNT — a prior set may have been deleted,
      // leaving a gap that COUNT would collide with.
      const agg = await tx.setEntry.aggregate({
        where: { memberId, exerciseId, workoutDate },
        _max: { setNumber: true },
      });
      setNumber = (agg._max.setNumber ?? 0) + 1;
    }

    const saved = await tx.setEntry.upsert({
      where: { memberId_exerciseId_workoutDate_setNumber: { memberId, exerciseId, workoutDate, setNumber } },
      create: { memberId, exerciseId, workoutDate, setNumber, weight, reps, estimated1RM, note },
      update: { weight, reps, estimated1RM, note },
    });

    const isPR = await checkAndRecordPR(tx, {
      memberId,
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
