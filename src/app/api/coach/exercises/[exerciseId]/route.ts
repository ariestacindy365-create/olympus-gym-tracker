import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { editExerciseSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/coach/exercises/[exerciseId]">
) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { exerciseId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = editExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nama gerakan minimal 2 karakter." }, { status: 400 });
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) {
    return NextResponse.json({ error: "Gerakan tidak ditemukan." }, { status: 404 });
  }

  const nameTaken = await prisma.exercise.findUnique({ where: { name: parsed.data.name } });
  if (nameTaken && nameTaken.id !== exerciseId) {
    return NextResponse.json({ error: "Gerakan itu sudah ada." }, { status: 409 });
  }

  const updated = await prisma.exercise.update({
    where: { id: exerciseId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ exercise: updated });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/coach/exercises/[exerciseId]">
) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { exerciseId } = await ctx.params;
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) {
    return NextResponse.json({ error: "Gerakan tidak ditemukan." }, { status: 404 });
  }

  const [setEntryCount, dailyWorkoutCount, personalRecordCount] = await Promise.all([
    prisma.setEntry.count({ where: { exerciseId } }),
    prisma.dailyWorkout.count({ where: { exerciseId } }),
    prisma.personalRecord.count({ where: { exerciseId } }),
  ]);

  if (setEntryCount > 0 || dailyWorkoutCount > 0 || personalRecordCount > 0) {
    return NextResponse.json(
      { error: "Gerakan ini sudah punya riwayat data dan tidak bisa dihapus." },
      { status: 400 }
    );
  }

  await prisma.exercise.delete({ where: { id: exerciseId } });
  return NextResponse.json({ ok: true });
}
