import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// "Salin program Coach X": replaces the signed-in coach's Minggu 1-4 with a
// copy of another coach's, as a starting point to edit.
export async function POST(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const fromCoachId = typeof body?.fromCoachId === "string" ? body.fromCoachId : "";
  if (!fromCoachId || fromCoachId === coach.id) {
    return NextResponse.json({ error: "Pilih program coach lain." }, { status: 400 });
  }
  const source = await prisma.trainingProgram.findMany({
    where: { coachId: fromCoachId },
    include: { days: { orderBy: { order: "asc" }, include: { slots: { orderBy: { order: "asc" } } } } },
  });
  if (source.length === 0) {
    return NextResponse.json({ error: "Coach itu belum punya program." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    for (const src of source) {
      // Deleting the program cascades to its days and slots.
      await tx.trainingProgram.deleteMany({ where: { coachId: coach.id, weekNumber: src.weekNumber } });
      const program = await tx.trainingProgram.create({ data: { weekNumber: src.weekNumber, coachId: coach.id } });
      for (const d of src.days) {
        const day = await tx.programDay.create({
          data: { programId: program.id, dayLabel: d.dayLabel, focusLabel: d.focusLabel, order: d.order },
        });
        if (d.slots.length > 0) {
          await tx.programSlot.createMany({
            data: d.slots.map((s) => ({
              dayId: day.id,
              slotLabel: s.slotLabel,
              movementId: s.movementId,
              sets: s.sets,
              repTarget: s.repTarget,
              targetWeight: s.targetWeight,
              note: s.note,
              roundScheme: s.roundScheme,
              order: s.order,
            })),
          });
        }
      }
    }
  });
  return NextResponse.json({ ok: true, weeks: source.map((p) => p.weekNumber).sort() });
}
