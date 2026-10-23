import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { todayDateKey } from "@/lib/workout";
import { summarizeDay } from "@/lib/workoutSummary";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// Totals + muscles for the "Selesai latihan hari ini" summary (all of
// today's sets, program rows and extra exercises alike).
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const [summary, lastWeighIn] = await Promise.all([
    summarizeDay(user.id, todayDateKey()),
    prisma.bodyMetric.findFirst({ where: { memberId: user.id }, orderBy: { recordedDate: "desc" }, select: { weight: true } }),
  ]);
  // Latest weigh-in, for the calorie estimate.
  return NextResponse.json({ summary, bodyWeightKg: lastWeighIn?.weight ?? null });
}
