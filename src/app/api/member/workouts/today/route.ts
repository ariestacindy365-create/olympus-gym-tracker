import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { todayDateKey } from "@/lib/workout";
import { summarizeDay } from "@/lib/workoutSummary";
import { Role } from "@/generated/prisma/client";

// Totals + muscles for the "Selesai latihan hari ini" summary (all of
// today's sets, program rows and extra exercises alike).
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  return NextResponse.json({ summary: await summarizeDay(user.id, todayDateKey(), true) });
}
