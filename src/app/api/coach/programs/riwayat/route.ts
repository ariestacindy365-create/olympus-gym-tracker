import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// Returns every saved-program snapshot within one calendar month, for the
// history calendar. `month` is "YYYY-MM"; defaults to the current month.
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

  const gte = new Date(year, month, 1);
  const lt = new Date(year, month + 1, 1);

  const snapshots = await prisma.programSnapshot.findMany({
    where: { createdAt: { gte, lt } },
    orderBy: { createdAt: "asc" },
    include: { coach: { select: { name: true } } },
  });

  return NextResponse.json({ snapshots });
}
