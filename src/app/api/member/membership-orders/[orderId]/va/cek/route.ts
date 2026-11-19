import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { midtransEnabled } from "@/lib/midtrans";
import { syncVa } from "@/lib/orders";
import { Role } from "@/generated/prisma/client";

// "Cek pembayaran" (and the screen's polling): asks Midtrans whether the VA was paid.
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/member/membership-orders/[orderId]/va/cek">) {
  const member = await getCurrentUser();
  if (!member || member.role !== Role.MEMBER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  if (!midtransEnabled()) return NextResponse.json({ error: "Pembayaran virtual account belum dibuka." }, { status: 404 });
  const { orderId } = await ctx.params;
  const order = await prisma.membershipOrder.findFirst({ where: { id: orderId, userId: member.id }, select: { status: true, gatewayOrderId: true } });
  if (!order) return NextResponse.json({ error: "Pembelian tidak ditemukan." }, { status: 404 });
  if (order.status === "APPROVED") return NextResponse.json({ status: "paid" });
  if (!order.gatewayOrderId) return NextResponse.json({ status: "none" });
  try {
    return NextResponse.json({ status: await syncVa(order.gatewayOrderId) });
  } catch (error) {
    console.error("VA check failed", error);
    return NextResponse.json({ status: "pending" });
  }
}
