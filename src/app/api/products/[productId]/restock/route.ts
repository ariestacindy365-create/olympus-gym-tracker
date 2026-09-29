import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { restockSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

// Adding stock is logged separately from editing the stock number directly
// (PATCH /api/products/[productId]) — keeps a "who added how much, when"
// trail instead of an opaque overwrite.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/products/[productId]/restock">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { productId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = restockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }

  // Reads the pre-restock stock inside the same transaction as the increment
  // (rather than from a findUnique beforehand) so two admins restocking the
  // same product at nearly the same moment can't both snapshot the same
  // "before" value.
  const { updatedProduct, restock } = await prisma.$transaction(async (tx) => {
    const before = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: parsed.data.quantity } },
    });
    const restock = await tx.restock.create({
      data: {
        productId,
        quantity: parsed.data.quantity,
        stockBefore: before.stock,
        stockAfter: updatedProduct.stock,
        createdById: admin.id,
      },
    });
    return { updatedProduct, restock };
  });

  return NextResponse.json({ product: updatedProduct, restock });
}
