import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewMembershipOrderSchema } from "@/lib/validation";
import { approveOrder, formatMembershipDate, OrderError } from "@/lib/membership";
import { notifyUsers } from "@/lib/notify";
import { Role } from "@/generated/prisma/client";

// Admin/owner confirms or rejects a member's app purchase.
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/membership-orders/[orderId]">) {
  const staff = await getCurrentUser();
  if (!staff || (staff.role !== Role.ADMIN && staff.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { orderId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = reviewMembershipOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  if (parsed.data.action === "approve") {
    try {
      const { membership, order } = await approveOrder(orderId, staff.id);
      after(() =>
        notifyUsers([order.userId], {
          type: "MEMBERSHIP",
          title: "Member aktif ✅",
          body: `${order.packageName} sudah dikonfirmasi, aktif ${formatMembershipDate(membership.startsAt)} s/d ${formatMembershipDate(membership.expiresAt)}.`,
          url: "/member/membership",
        })
      );
      return NextResponse.json({ ok: true, membershipId: membership.id });
    } catch (error) {
      if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  const reason = parsed.data.reason;
  const order = await prisma.membershipOrder.findUnique({ where: { id: orderId } });
  const done = await prisma.membershipOrder.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "REJECTED", rejectReason: reason, reviewedById: staff.id, reviewedAt: new Date() },
  });
  if (!order || done.count === 0) {
    return NextResponse.json({ error: "Pesanan ini sudah diproses atau tidak ditemukan." }, { status: 409 });
  }
  after(() =>
    notifyUsers([order.userId], {
      type: "MEMBERSHIP",
      title: "Pembelian member ditolak",
      body: `${order.packageName}: ${reason}`,
      url: "/member/membership",
    })
  );
  return NextResponse.json({ ok: true });
}
