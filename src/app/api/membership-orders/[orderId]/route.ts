import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewMembershipOrderSchema } from "@/lib/validation";
import { approveOrder, OrderError } from "@/lib/orders";
import { NO_EXPIRY_END } from "@/lib/packageRules";
import { notifyUsers } from "@/lib/notify";
import { Role } from "@/generated/prisma/client";

const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Admin/owner confirms (the money arrived) or rejects a member's app purchase.
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/membership-orders/[orderId]">) {
  const staff = await getCurrentUser();
  if (!staff || (staff.role !== Role.ADMIN && staff.role !== Role.OWNER)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { orderId } = await ctx.params;
  const parsed = reviewMembershipOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });

  if (parsed.data.action === "approve") {
    try {
      const { membership, order } = await approveOrder(orderId, staff.id);
      const until = membership.expiresAt.toISOString().slice(0, 10) === NO_EXPIRY_END ? "tanpa batas waktu" : `s/d ${fmt(membership.expiresAt)}`;
      after(() =>
        notifyUsers([order.userId], {
          type: "MEMBERSHIP",
          title: "Paket aktif ✅",
          body: `${order.packageName} sudah dikonfirmasi, aktif mulai ${fmt(membership.startsAt)} ${until}.`,
          url: "/member/paket",
        }).catch(() => {})
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
  if (!order || done.count === 0) return NextResponse.json({ error: "Pesanan ini sudah diproses atau tidak ditemukan." }, { status: 409 });
  after(() => notifyUsers([order.userId], { type: "MEMBERSHIP", title: "Pembelian paket ditolak", body: `${order.packageName}: ${reason}`, url: "/member/paket" }).catch(() => {}));
  return NextResponse.json({ ok: true });
}
