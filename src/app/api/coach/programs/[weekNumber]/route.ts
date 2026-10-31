import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveProgramWeekSchema } from "@/lib/validation";
import { ProgramConflictError } from "@/lib/programVersion";
import { writeProgramWeek } from "@/lib/programSave";
import { Role } from "@/generated/prisma/client";
import { getProgramCycle } from "@/lib/programHistory";

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
  const { weeks } = await getProgramCycle(coach.id);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > weeks) {
    return NextResponse.json({ error: `Minggu harus antara 1-${weeks}.` }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body) || !("expectedVersion" in body) || (body.expectedVersion !== null && typeof body.expectedVersion !== "string")) return NextResponse.json({ error: "Muat ulang program untuk mengambil versinya sebelum menyimpan." }, { status: 428 });
  const parsed = saveProgramWeekSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: describeValidationError(parsed.error, body) }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const days = await writeProgramWeek(tx, coach.id, weekNumber, parsed.data.days, body.expectedVersion);
      const program = await tx.trainingProgram.findFirst({ where: { coachId: coach.id, weekNumber }, select: { updatedAt: true } });
      return { days, version: program!.updatedAt.toISOString() };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProgramConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
