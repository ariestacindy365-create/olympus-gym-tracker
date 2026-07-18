import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { epley1RM } from "@/lib/oneRepMax";
import { recomputeExerciseRecords } from "@/lib/recomputeRecords";
import { todayDateKey } from "@/lib/workout";
import { editSetEntrySchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/member/sets/[setId]">) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { setId } = await ctx.params;
  const existing = await prisma.setEntry.findUnique({ where: { id: setId } });
  if (!existing || existing.memberId !== user.id) {
    return NextResponse.json({ error: "Set tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = editSetEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Isi beban dan reps yang valid." }, { status: 400 });
  }
  const { weight, reps, note } = parsed.data;
  const estimated1RM = epley1RM(weight, reps);

  const sets = await prisma.$transaction(async (tx) => {
    await tx.setEntry.update({
      where: { id: setId },
      data: { weight, reps, estimated1RM, note: note ?? null },
    });
    await recomputeExerciseRecords(tx, user.id, existing.exerciseId);
    return tx.setEntry.findMany({
      where: { memberId: user.id, exerciseId: existing.exerciseId, workoutDate: todayDateKey() },
      orderBy: { setNumber: "asc" },
    });
  });

  return NextResponse.json({ sets });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/member/sets/[setId]">) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { setId } = await ctx.params;
  const existing = await prisma.setEntry.findUnique({ where: { id: setId } });
  if (!existing || existing.memberId !== user.id) {
    return NextResponse.json({ error: "Set tidak ditemukan." }, { status: 404 });
  }

  const { sets, allSets } = await prisma.$transaction(async (tx) => {
    await tx.setEntry.delete({ where: { id: setId } });
    await recomputeExerciseRecords(tx, user.id, existing.exerciseId);
    const [sets, allSets] = await Promise.all([
      tx.setEntry.findMany({
        where: { memberId: user.id, exerciseId: existing.exerciseId, workoutDate: todayDateKey() },
        orderBy: { setNumber: "asc" },
      }),
      tx.setEntry.findMany({
        where: { memberId: user.id, exerciseId: existing.exerciseId },
        orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
      }),
    ]);
    return { sets, allSets };
  });

  return NextResponse.json({ sets, allSets });
}
