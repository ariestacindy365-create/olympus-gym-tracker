import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bodyMetricSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/member/body-metrics/[id]">) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.bodyMetric.findUnique({ where: { id } });
  if (!existing || existing.memberId !== user.id) {
    return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodyMetricSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Isi berat badan yang valid." }, { status: 400 });
  }
  const { weight, bodyFatPercent, skeletalMuscleMass, note } = parsed.data;

  await prisma.bodyMetric.update({
    where: { id },
    data: {
      weight,
      bodyFatPercent: bodyFatPercent ?? null,
      skeletalMuscleMass: skeletalMuscleMass ?? null,
      note: note ?? null,
    },
  });

  const entries = await prisma.bodyMetric.findMany({
    where: { memberId: user.id },
    orderBy: { recordedDate: "asc" },
  });

  return NextResponse.json({ entries });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/member/body-metrics/[id]">) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.bodyMetric.findUnique({ where: { id } });
  if (!existing || existing.memberId !== user.id) {
    return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  }

  await prisma.bodyMetric.delete({ where: { id } });

  const entries = await prisma.bodyMetric.findMany({
    where: { memberId: user.id },
    orderBy: { recordedDate: "asc" },
  });

  return NextResponse.json({ entries });
}
