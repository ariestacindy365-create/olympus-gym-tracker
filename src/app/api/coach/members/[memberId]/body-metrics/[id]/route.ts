import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bodyMetricSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/coach/members/[memberId]/body-metrics/[id]">
) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId, id } = await ctx.params;
  const existing = await prisma.bodyMetric.findUnique({ where: { id } });
  if (!existing || existing.memberId !== memberId) {
    return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodyMetricSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Isi berat badan yang valid." }, { status: 400 });
  }
  const { weight, bodyFatPercent, skeletalMuscleMass, visceralFat, note } = parsed.data;

  await prisma.bodyMetric.update({
    where: { id },
    data: {
      weight,
      bodyFatPercent: bodyFatPercent ?? null,
      skeletalMuscleMass: skeletalMuscleMass ?? null,
      visceralFat: visceralFat ?? null,
      note: note ?? null,
    },
  });

  const entries = await prisma.bodyMetric.findMany({
    where: { memberId },
    orderBy: { recordedDate: "asc" },
  });

  return NextResponse.json({ entries });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/coach/members/[memberId]/body-metrics/[id]">
) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId, id } = await ctx.params;
  const existing = await prisma.bodyMetric.findUnique({ where: { id } });
  if (!existing || existing.memberId !== memberId) {
    return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  }

  await prisma.bodyMetric.delete({ where: { id } });

  const entries = await prisma.bodyMetric.findMany({
    where: { memberId },
    orderBy: { recordedDate: "asc" },
  });

  return NextResponse.json({ entries });
}
