import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateKeyFromString } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

// Sales history for a date range (Riwayat tab on Kasir) — ADMIN and OWNER
// can both view; only ADMIN can delete (see [saleId]/route.ts).
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
  }

  const fromDate = dateKeyFromString(from);
  const toDateExclusive = addDays(dateKeyFromString(to), 1);

  const sales = await prisma.sale.findMany({
    where: { deletedAt: null, createdAt: { gte: fromDate, lt: toDateExclusive } },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ sales });
}
