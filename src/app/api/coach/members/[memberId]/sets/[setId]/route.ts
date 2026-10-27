import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimate1RMFor } from "@/lib/oneRepMax";
import { recomputeExerciseRecords } from "@/lib/recomputeRecords";
import { coachEditSetEntrySchema, amountFitsUnit } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/coach/members/[memberId]/sets/[setId]">) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId, setId } = await ctx.params;
  const existing = await prisma.setEntry.findUnique({ where: { id: setId }, include: { member: { select: { role: true } } } });
  if (!existing || existing.memberId !== memberId || existing.member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Set tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = coachEditSetEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Isi beban dan reps yang valid." }, { status: 400 });
  }
  const { weight, reps, note } = parsed.data;
  if (!amountFitsUnit(reps, existing.unit)) {
    return NextResponse.json({ error: "Isi beban dan jumlah yang valid." }, { status: 400 });
  }
  const estimated1RM = estimate1RMFor(weight, reps, existing.unit);

  const sets = await prisma.$transaction(async (tx) => {
    await tx.setEntry.update({
      where: { id: setId },
      data: { weight, reps, estimated1RM, note: note ?? null },
    });
    await recomputeExerciseRecords(tx, memberId, existing.exerciseId);
    return tx.setEntry.findMany({
      where: { memberId, exerciseId: existing.exerciseId },
      orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
    });
  });


  return NextResponse.json({ sets });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/coach/members/[memberId]/sets/[setId]">) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId, setId } = await ctx.params;
  const existing = await prisma.setEntry.findUnique({ where: { id: setId }, include: { member: { select: { role: true } } } });
  if (!existing || existing.memberId !== memberId || existing.member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Set tidak ditemukan." }, { status: 404 });
  }

  const sets = await prisma.$transaction(async (tx) => {
    await tx.setEntry.delete({ where: { id: setId } });
    await recomputeExerciseRecords(tx, memberId, existing.exerciseId);
    return tx.setEntry.findMany({
      where: { memberId, exerciseId: existing.exerciseId },
      orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
    });
  });


  return NextResponse.json({ sets });
}
