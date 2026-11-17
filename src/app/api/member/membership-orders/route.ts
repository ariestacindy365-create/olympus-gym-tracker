import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMembershipOrderSchema } from "@/lib/validation";
import { closeStaleUnpaid, pickUniqueCode } from "@/lib/orders";
import { Role } from "@/generated/prisma/client";

// A member picks a package. They get the exact amount to transfer: the price
// plus a small unique code, so the admin can find it in the bank statement.
// The proof follows (PATCH /api/member/membership-orders/[orderId]).
export async function POST(request: NextRequest) {
  const member = await getCurrentUser();
  if (!member || member.role !== Role.MEMBER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  // Missing or broken JSON: say so in Indonesian, not zod's English.
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  const parsed = createMembershipOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });

  const pkg = await prisma.package.findUnique({ where: { id: parsed.data.packageId } });
  if (!pkg || !pkg.isActive || !pkg.showInApp || !pkg.kind) return NextResponse.json({ error: "Paket ini tidak tersedia." }, { status: 404 });
  await closeStaleUnpaid(member.id);
  const open = await prisma.membershipOrder.findFirst({ where: { userId: member.id, status: { in: ["UNPAID", "PENDING"] } } });
  if (open) {
    return NextResponse.json(
      { error: open.status === "PENDING" ? "Masih ada pembelian yang menunggu verifikasi admin." : "Selesaikan atau batalkan pembelian yang sedang berjalan dulu." },
      { status: 409 }
    );
  }
  const order = await prisma.membershipOrder.create({
    data: {
      userId: member.id,
      packageId: pkg.id,
      packageName: pkg.name,
      kind: pkg.kind,
      price: pkg.price,
      credits: pkg.credits,
      durationDays: pkg.durationDays,
      durationMonths: pkg.durationMonths,
      uniqueCode: await pickUniqueCode(pkg.price),
    },
    select: { id: true, price: true, uniqueCode: true },
  });
  return NextResponse.json({ order });
}
