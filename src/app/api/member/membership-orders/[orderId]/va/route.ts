import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { midtransEnabled } from "@/lib/midtrans";
import { OrderError, startVa } from "@/lib/orders";
import { isVaBank } from "@/lib/vaBanks";
import { Role } from "@/generated/prisma/client";

// The member picks a bank: { bank: "bca" | "bni" | "bri" | "mandiri" } → a VA number to pay to.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/member/membership-orders/[orderId]/va">) {
  const member = await getCurrentUser();
  if (!member || member.role !== Role.MEMBER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  if (!midtransEnabled()) return NextResponse.json({ error: "Pembayaran virtual account belum dibuka." }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!isVaBank(body?.bank)) return NextResponse.json({ error: "Pilih bank." }, { status: 400 });
  const { orderId } = await ctx.params;
  try {
    const order = await startVa({ orderId, userId: member.id, bank: body.bank });
    return NextResponse.json({ bank: order.vaBank, vaNumber: order.vaNumber, billerCode: order.vaBillerCode, expiresAt: order.vaExpiresAt, amount: order.price });
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("VA start failed", error);
    return NextResponse.json({ error: "Nomor virtual account belum bisa dibuat. Coba lagi sebentar, atau pakai transfer manual." }, { status: 502 });
  }
}
