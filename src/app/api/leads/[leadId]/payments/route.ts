import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentSchema } from "@/lib/validation";
import { dateKeyFromString } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

// Records a payment (initial or renewal) for a member so it can be printed
// as a receipt at /leads/[leadId]/receipt/[paymentId].
export async function POST(request: NextRequest, ctx: RouteContext<"/api/leads/[leadId]/payments">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { leadId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.deletedAt) {
    return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
  }

  const payment = await prisma.payment.create({
    data: {
      leadId,
      packageName: parsed.data.packageName,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      paidAt: parsed.data.paidAt ? dateKeyFromString(parsed.data.paidAt) : new Date(),
      note: parsed.data.note,
      createdById: admin.id,
    },
  });

  return NextResponse.json({ payment });
}
