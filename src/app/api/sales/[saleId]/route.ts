import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// Soft delete — corrects a mistake (e.g. a double scan) and restores the
// product's stock by 1, in one transaction. Same reasoning as Payment's
// delete: the row stays so it shows up as an audit trail on Riwayat.
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/sales/[saleId]">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { saleId } = await ctx.params;
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  }
  if (sale.deletedAt) {
    return NextResponse.json({ error: "Transaksi sudah dihapus sebelumnya." }, { status: 409 });
  }

  // Only the request that actually marks it deleted gives the stock back,
  // so two admins tapping at once can't add it twice.
  const restored = await prisma.$transaction(async (tx) => {
    const marked = await tx.sale.updateMany({
      where: { id: saleId, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: admin.id },
    });
    if (marked.count === 0) return false;
    await tx.product.update({ where: { id: sale.productId }, data: { stock: { increment: 1 } } });
    return true;
  });
  if (!restored) {
    return NextResponse.json({ error: "Transaksi sudah dihapus sebelumnya." }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
