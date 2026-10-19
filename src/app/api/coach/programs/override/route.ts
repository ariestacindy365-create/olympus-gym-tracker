import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { mondayOf, weekNumberForDate } from "@/lib/programRotation";
import { getOrCreateRotation } from "@/lib/programHistory";

// Runs a different Minggu for the current week only ("pakai Minggu 2 untuk
// minggu ini"); the rotation itself is untouched, so next week is back on
// schedule. Picking the week the rotation would use anyway — or DELETE —
// clears the exception.
export async function PUT(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const weekNumber = Number(body?.weekNumber);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 4) {
    return NextResponse.json({ error: "Nomor minggu tidak valid." }, { status: 400 });
  }

  const weekStart = mondayOf(new Date());
  const rotation = await getOrCreateRotation();
  if (weekNumberForDate(weekStart, rotation.anchorMonday, rotation.anchorWeekNumber) === weekNumber) {
    await prisma.programWeekOverride.deleteMany({ where: { weekStart } });
    return NextResponse.json({ ok: true, overridden: false });
  }

  await prisma.programWeekOverride.upsert({
    where: { weekStart },
    create: { weekStart, weekNumber, coachId: coach.id },
    update: { weekNumber, coachId: coach.id },
  });
  return NextResponse.json({ ok: true, overridden: true });
}

export async function DELETE() {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  await prisma.programWeekOverride.deleteMany({ where: { weekStart: mondayOf(new Date()) } });
  return NextResponse.json({ ok: true, overridden: false });
}
