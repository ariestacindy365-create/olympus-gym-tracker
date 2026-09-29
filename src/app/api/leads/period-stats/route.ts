import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addDays } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { getPeriodStats } from "@/lib/leads";
import { dateKeyFromString } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

// Owner-only "how are we doing this period" numbers behind the Overview's
// Hari Ini/Minggu Ini/Bulan Ini/custom-range filter — see PeriodStatsCard.
export async function GET(request: NextRequest) {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== Role.OWNER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
  }

  const start = dateKeyFromString(from);
  const endExclusive = addDays(dateKeyFromString(to), 1);

  const stats = await getPeriodStats(start, endExclusive);
  return NextResponse.json(stats);
}
