import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMembershipOrderSchema } from "@/lib/validation";
import { closeStaleUnpaid, pickUniqueCode } from "@/lib/membership";
import { Role } from "@/generated/prisma/client";

// A member (or someone who just signed up) picks a package. They get the
// exact amount to pay: the price plus a small unique code, so the admin can
// find their transfer in the bank statement. The proof follows (PATCH).
export async function POST(request: NextRequest) {
  const member = await getCurrentUser();
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createMembershipOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const pkg = await prisma.package.findUnique({ where: { id: parsed.data.packageId } });
  if (!pkg || !pkg.isActive || !pkg.showInApp || !pkg.durationDays) {
    return NextResponse.json({ error: "Paket ini tidak tersedia." }, { status: 404 });
  }
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
      price: pkg.price,
      durationDays: pkg.durationDays,
      credits: pkg.credits,
      uniqueCode: await pickUniqueCode(pkg.price),
    },
    select: { id: true, status: true, price: true, uniqueCode: true },
  });
  return NextResponse.json({ order });
}
