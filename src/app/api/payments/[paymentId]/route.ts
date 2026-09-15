import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// Soft delete — same reasoning as Lead: the row (and its receipt) stays,
// just flagged, so the correction shows up as an audit trail on Riwayat
// for OWNER to see instead of silently vanishing from the numbers.
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/payments/[paymentId]">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { paymentId } = await ctx.params;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });
  }
  if (payment.deletedAt) {
    return NextResponse.json({ error: "Pembayaran sudah dihapus sebelumnya." }, { status: 409 });
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { deletedAt: new Date(), deletedById: admin.id },
  });

  return NextResponse.json({ ok: true });
}
