import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { mondayOf } from "@/lib/programRotation";
import { getOrCreateRotation } from "@/lib/programHistory";

export async function GET() {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const rotation = await getOrCreateRotation();
  return NextResponse.json({ rotation });
}

export async function PUT(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const dateStr = typeof body?.date === "string" ? body.date : null;
  const weekNumber = Number(body?.weekNumber);
  const date = dateStr ? new Date(dateStr) : null;
  if (!date || Number.isNaN(date.getTime()) || !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 4) {
    return NextResponse.json({ error: "Tanggal atau nomor minggu tidak valid." }, { status: 400 });
  }

  const rotation = await prisma.programRotation.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", anchorMonday: mondayOf(date), anchorWeekNumber: weekNumber },
    update: { anchorMonday: mondayOf(date), anchorWeekNumber: weekNumber },
  });

  return NextResponse.json({ rotation });
}
