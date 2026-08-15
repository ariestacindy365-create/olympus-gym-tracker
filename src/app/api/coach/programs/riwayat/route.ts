import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@/generated/prisma/client";
import { computeMonthProgramDays } from "@/lib/programHistory";

export async function GET(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const monthParam = request.nextUrl.searchParams.get("month");
  const match = monthParam?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth();

  const { rotation, days } = await computeMonthProgramDays(year, month);
  return NextResponse.json({ rotation, days });
}
