import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deskSaleSchema } from "@/lib/validation";
import { OrderError, sellAtDesk } from "@/lib/orders";
import { Role } from "@/generated/prisma/client";

// A member pays at the front desk (cash, debit / credit card, QRIS,
// transfer): the membership is active straight away and the payment is
// recorded on their lead for the reports.
export async function POST(request: NextRequest) {
  const staff = await getCurrentUser();
  if (!staff || (staff.role !== Role.ADMIN && staff.role !== Role.OWNER)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const parsed = deskSaleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  try {
    const { membership, payment } = await sellAtDesk({ ...parsed.data, waNumber: parsed.data.waNumber || null, staffId: staff.id });
    return NextResponse.json({ membershipId: membership.id, paymentId: payment.id, leadId: payment.leadId });
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
