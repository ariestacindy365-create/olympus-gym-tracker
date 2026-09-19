import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scanSaleSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

// A jittery scanner (or a trigger held too long) can fire the same barcode
// twice within a moment — the client already guards against this, but that's
// just one browser tab. This is the backstop that holds regardless of what
// sent the request, and deliberately isn't scoped to one admin: two shift
// admins both scanning the same physical item within the window (e.g.
// handing it off at the counter) is exactly the same mistake.
const DUPLICATE_SCAN_COOLDOWN_MS = 3000;

// Each scan = one unit sold. Stock decrement uses a conditional updateMany
// (stock > 0) inside the transaction instead of read-then-write, so two
// scans landing at nearly the same moment can't both succeed against the
// last unit.
export async function POST(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = scanSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { barcode: parsed.data.barcode } });
  if (!product || !product.isActive) {
    return NextResponse.json({ error: "Produk tidak ditemukan atau nonaktif." }, { status: 404 });
  }
  if (product.stock <= 0) {
    return NextResponse.json({ error: `Stok "${product.name}" habis.` }, { status: 400 });
  }

  const recentDuplicate = await prisma.sale.findFirst({
    where: {
      productId: product.id,
      deletedAt: null,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_SCAN_COOLDOWN_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recentDuplicate) {
    return NextResponse.json(
      { error: `"${product.name}" baru saja dicatat — ditolak supaya tidak tercatat dobel.` },
      { status: 409 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.product.updateMany({
        where: { id: product.id, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (updateResult.count === 0) {
        throw new Error("OUT_OF_STOCK");
      }
      const updatedProduct = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
      const sale = await tx.sale.create({
        data: {
          productId: product.id,
          productName: product.name,
          price: product.price,
          paymentMethod: parsed.data.paymentMethod,
          createdById: admin.id,
        },
      });
      return { sale, stock: updatedProduct.stock };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "OUT_OF_STOCK") {
      return NextResponse.json({ error: `Stok "${product.name}" habis.` }, { status: 400 });
    }
    throw error;
  }
}
