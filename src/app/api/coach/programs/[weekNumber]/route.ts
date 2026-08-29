import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveProgramWeekSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

const FIELD_LABELS: Record<string, string> = {
  dayLabel: "Nama hari",
  slotLabel: "Slot",
  movementId: "Gerakan",
  sets: "Set",
  repTarget: "Rep Target",
  targetWeight: "Beban (kg)",
  note: "Catatan",
  roundScheme: "Skema Round",
};

// Zod's default error only says a shape mismatched somewhere in the payload
// — not which day, which row, or which field. Walk the failing path back
// through the raw request body so the message tells the coach exactly
// where to look instead of just "data tidak valid".
function describeValidationError(error: ZodError, body: unknown): string {
  const issue = error.issues[0];
  if (!issue) return "Data program tidak valid.";

  const path = issue.path;
  let location = "";
  if (path[0] === "days" && typeof path[1] === "number") {
    const day = (body as { days?: unknown[] })?.days?.[path[1]] as { dayLabel?: string } | undefined;
    const dayName = day?.dayLabel?.trim() || `Hari ke-${path[1] + 1}`;
    if (path[2] === "slots" && typeof path[3] === "number") {
      const slot = (day as { slots?: unknown[] })?.slots?.[path[3]] as { slotLabel?: string } | undefined;
      const slotName = slot?.slotLabel?.trim() || `gerakan ke-${path[3] + 1}`;
      location = `${dayName} — ${slotName}`;
    } else {
      location = dayName;
    }
  }

  const fieldKey = String(path[path.length - 1] ?? "");
  const fieldLabel = FIELD_LABELS[fieldKey] ?? fieldKey;
  const detail = location ? `${location}: ${fieldLabel}` : fieldLabel;
  return `Data tidak valid — ${detail}. Cek nilainya lalu simpan ulang.`;
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/coach/programs/[weekNumber]">
) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { weekNumber: weekNumberRaw } = await ctx.params;
  const weekNumber = Number(weekNumberRaw);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 4) {
    return NextResponse.json({ error: "Minggu harus antara 1-4." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveProgramWeekSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: describeValidationError(parsed.error, body) }, { status: 400 });
  }

  const days = await prisma.$transaction(async (tx) => {
    const program = await tx.trainingProgram.upsert({
      where: { weekNumber },
      create: { weekNumber, coachId: coach.id },
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
            roundScheme: s.roundScheme ?? null,
            order: j,
          })),
        });
      }
    }

    const savedDays = await tx.programDay.findMany({
      where: { programId: program.id },
      orderBy: { order: "asc" },
      include: { slots: { orderBy: { order: "asc" }, include: { movement: true } } },
    });

    // Movement names are baked in now — the live rows only keep movementId,
    // so without this the snapshot would go stale if a movement is later
    // renamed or deleted.
    await tx.programSnapshot.create({
      data: {
        weekNumber,
        coachId: coach.id,
        data: {
          days: savedDays.map((d) => ({
            dayLabel: d.dayLabel,
            focusLabel: d.focusLabel,
            slots: d.slots.map((s) => ({
              slotLabel: s.slotLabel,
              movementName: s.movement.name,
              sets: s.sets,
              repTarget: s.repTarget,
              targetWeight: s.targetWeight,
              note: s.note,
              roundScheme: s.roundScheme,
            })),
          })),
        },
      },
    });

    return savedDays;
  });

  return NextResponse.json({ days });
}
