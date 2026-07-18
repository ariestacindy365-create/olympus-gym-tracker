import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveProgramWeekSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/coach/programs/[memberId]/[weekNumber]">
) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId, weekNumber: weekNumberRaw } = await ctx.params;
  const weekNumber = Number(weekNumberRaw);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 4) {
    return NextResponse.json({ error: "Minggu harus antara 1-4." }, { status: 400 });
  }

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveProgramWeekSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data program tidak valid." }, { status: 400 });
  }

  const days = await prisma.$transaction(async (tx) => {
    const program = await tx.trainingProgram.upsert({
      where: { memberId_weekNumber: { memberId, weekNumber } },
      create: { memberId, weekNumber, coachId: coach.id },
      update: { coachId: coach.id },
    });

    await tx.programDay.deleteMany({ where: { programId: program.id } });

    for (let i = 0; i < parsed.data.days.length; i++) {
      const d = parsed.data.days[i];
      const day = await tx.programDay.create({
        data: { programId: program.id, dayLabel: d.dayLabel, focusLabel: d.focusLabel ?? null, order: i },
      });
      if (d.slots.length > 0) {
        await tx.programSlot.createMany({
          data: d.slots.map((s, j) => ({
            dayId: day.id,
            slotLabel: s.slotLabel ?? null,
            movementId: s.movementId,
            sets: s.sets ?? null,
            repTarget: s.repTarget ?? null,
            targetWeight: s.targetWeight ?? null,
            note: s.note ?? null,
            order: j,
          })),
        });
      }
    }

    return tx.programDay.findMany({
      where: { programId: program.id },
      orderBy: { order: "asc" },
      include: { slots: { orderBy: { order: "asc" }, include: { movement: true } } },
    });
  });

  return NextResponse.json({ days });
}
