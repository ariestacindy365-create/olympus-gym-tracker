import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, type Prisma } from "@/generated/prisma/client";
import { DEFAULT_PROGRAM_WEEKS, MAX_PROGRAM_WEEKS, mondayOf, weekNumberForDate } from "@/lib/programRotation";
import { getProgramCycle, type StoredCycle } from "@/lib/programHistory";

// How many Minggu this coach's program has ("+ Tambah minggu", up to 12).
// The week running now stays the same: the rotation is re-anchored on this
// Monday, so only the weeks after it follow the new length. A week can be
// removed only from the end, and only while it's empty.
export async function PUT(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const weeks = Number(body?.weeks);
  if (!Number.isInteger(weeks) || weeks < DEFAULT_PROGRAM_WEEKS || weeks > MAX_PROGRAM_WEEKS) {
    return NextResponse.json({ error: `Jumlah minggu ${DEFAULT_PROGRAM_WEEKS}–${MAX_PROGRAM_WEEKS}.` }, { status: 400 });
  }

  const cycle = await getProgramCycle(coach.id);
  if (weeks < cycle.weeks) {
    const used = await prisma.trainingProgram.findFirst({
      where: { coachId: coach.id, weekNumber: { gt: weeks }, days: { some: { slots: { some: {} } } } },
      select: { weekNumber: true },
    });
    if (used) {
      return NextResponse.json({ error: `Minggu ${used.weekNumber} masih berisi program. Kosongkan dulu sebelum dihapus.` }, { status: 409 });
    }
  }

  const monday = mondayOf(new Date());
  const now = weekNumberForDate(monday, cycle.anchorMonday, cycle.anchorWeekNumber, cycle.weeks);
  // Weeks before this Monday keep the rotation they ran on. If the length was
  // already changed this week, the current rotation never ran a past week.
  const store = (c: { weeks: number; anchorMonday: Date; anchorWeekNumber: number }, until: Date): StoredCycle => ({
    weeks: c.weeks, anchorMonday: c.anchorMonday.toISOString(), anchorWeekNumber: c.anchorWeekNumber, until: until.toISOString(),
  });
  const history: StoredCycle[] = [
    ...(cycle.earlier ?? []).filter((c) => c.until.getTime() <= monday.getTime()).map((c) => store(c, c.until)),
    ...(cycle.earlier?.some((c) => c.until.getTime() === monday.getTime()) ? [] : [store(cycle, monday)]),
  ].slice(-50);
  const next = { weeks, anchorMonday: monday, anchorWeekNumber: now <= weeks ? now : 1, history: history as unknown as Prisma.InputJsonValue };
  const rotation = await prisma.coachProgramCycle.upsert({
    where: { coachId: coach.id },
    create: { coachId: coach.id, ...next },
    update: next,
  });
  return NextResponse.json({ rotation });
}
