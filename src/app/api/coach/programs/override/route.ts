import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { mondayOf, weekNumberForDate } from "@/lib/programRotation";
import { getProgramCycle } from "@/lib/programHistory";

// Runs a different Minggu of this coach's program for the current week only
// ("pakai Minggu 2 untuk minggu ini"); their rotation itself is untouched,
// so next week is back on schedule, and other coaches are unaffected.
// Picking the week the rotation would use anyway — or DELETE — clears it.
async function clearThisWeek(coachId: string, weekStart: Date) {
  await prisma.$transaction([
    prisma.coachWeekOverride.deleteMany({ where: { coachId, weekStart } }),
    // An exception set before overrides were per coach.
    prisma.programWeekOverride.deleteMany({ where: { coachId, weekStart } }),
  ]);
}

export async function PUT(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const weekNumber = Number(body?.weekNumber);
  const cycle = await getProgramCycle(coach.id);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > cycle.weeks) {
    return NextResponse.json({ error: "Nomor minggu tidak valid." }, { status: 400 });
  }

  const weekStart = mondayOf(new Date());
  if (weekNumberForDate(weekStart, cycle.anchorMonday, cycle.anchorWeekNumber, cycle.weeks) === weekNumber) {
    await clearThisWeek(coach.id, weekStart);
    return NextResponse.json({ ok: true, overridden: false });
  }

  await prisma.coachWeekOverride.upsert({
    where: { coachId_weekStart: { coachId: coach.id, weekStart } },
    create: { weekStart, weekNumber, coachId: coach.id },
    update: { weekNumber },
  });
  return NextResponse.json({ ok: true, overridden: true });
}

export async function DELETE() {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  await clearThisWeek(coach.id, mondayOf(new Date()));
  return NextResponse.json({ ok: true, overridden: false });
}
