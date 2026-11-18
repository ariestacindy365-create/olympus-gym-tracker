import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lockForWrite } from "@/lib/writeLock";
import { Role } from "@/generated/prisma/client";

// Soft delete (the package sold with it is taken back if unused) — same reasoning as Lead: the row (and its receipt) stays,
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

  // The package sold with this payment goes too, unless it's been used:
  // then its bookings have to be removed first.
  const used = await prisma.$transaction(async (tx) => {
    await lockForWrite(tx);
    const membership = await tx.membership.findUnique({ where: { paymentId }, select: { id: true, creditsUsed: true } });
    if (membership) {
      const bookings = await tx.classBooking.count({ where: { membershipId: membership.id } });
      if (membership.creditsUsed > 0 || bookings > 0) return true;
      await tx.membership.delete({ where: { id: membership.id } });
    }
    await tx.payment.update({ where: { id: paymentId }, data: { deletedAt: new Date(), deletedById: admin.id } });
    return false;
  });
  if (used) {
    return NextResponse.json(
      { error: "Paket dari pembayaran ini sudah dipakai booking kelas. Hapus booking-nya dulu di tab Kelas, lalu hapus pembayarannya." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
