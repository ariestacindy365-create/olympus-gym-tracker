import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { bodyMetricSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/coach/members/[memberId]/body-metrics">) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId } = await ctx.params;
  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodyMetricSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Isi berat badan yang valid." }, { status: 400 });
  }
  const { weight, bodyFatPercent, skeletalMuscleMass, note } = parsed.data;
  // Date-only strings ("YYYY-MM-DD") parse as UTC midnight, matching how
  // todayDateKey() stores every other date-keyed row in this app.
  const recordedDate = parsed.data.recordedDate ? new Date(parsed.data.recordedDate) : todayDateKey();

  await prisma.bodyMetric.upsert({
    where: { memberId_recordedDate: { memberId, recordedDate } },
    create: { memberId, recordedDate, weight, bodyFatPercent, skeletalMuscleMass, note },
    update: {
      weight,
      bodyFatPercent: bodyFatPercent ?? null,
      skeletalMuscleMass: skeletalMuscleMass ?? null,
      note: note ?? null,
    },
  });

  const entries = await prisma.bodyMetric.findMany({
    where: { memberId },
    orderBy: { recordedDate: "asc" },
  });

  return NextResponse.json({ entries });
}
