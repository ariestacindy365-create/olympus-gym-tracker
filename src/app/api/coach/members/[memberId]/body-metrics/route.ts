import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey, dateKeyFromString } from "@/lib/workout";
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
  // Must use the exact same local-midnight convention as todayDateKey(), or
  // a coach picking "today" from the date picker keys to a different
  // timestamp than the member's own same-day entry and creates a duplicate
  // row instead of updating it.
  const recordedDate = parsed.data.recordedDate ? dateKeyFromString(parsed.data.recordedDate) : todayDateKey();

  const entry = await prisma.bodyMetric.upsert({
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

  return NextResponse.json({ entry, entries });
}
