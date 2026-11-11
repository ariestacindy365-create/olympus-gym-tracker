import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// The member cancels their own purchase while it still waits for the admin.
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/member/membership-orders/[orderId]">) {
  const member = await getCurrentUser();
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { orderId } = await ctx.params;
  const done = await prisma.membershipOrder.updateMany({
    where: { id: orderId, userId: member.id, status: "PENDING" },
    data: { status: "CANCELLED", proofImageData: null },
  });
  if (done.count === 0) {
    return NextResponse.json({ error: "Pesanan ini sudah diproses atau tidak ditemukan." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
