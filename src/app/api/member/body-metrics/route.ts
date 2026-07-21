import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { bodyMetricSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodyMetricSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Isi berat badan yang valid." }, { status: 400 });
  }
  const { weight, bodyFatPercent, skeletalMuscleMass, note } = parsed.data;
  const recordedDate = todayDateKey();

  await prisma.bodyMetric.upsert({
    where: { memberId_recordedDate: { memberId: user.id, recordedDate } },
    create: { memberId: user.id, recordedDate, weight, bodyFatPercent, skeletalMuscleMass, note },
    update: {
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
