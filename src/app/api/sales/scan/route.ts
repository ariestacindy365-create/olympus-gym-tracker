import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scanSaleSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

// A jittery scanner (or a trigger held too long) can fire the same barcode
// twice within a moment, and isn't scoped to one admin: two shift admins
// both scanning the same physical item within the window (e.g. handing it
// off at the counter) can be the same mistake too. But it's only ever a
// *warning* (see DuplicateScanWarning below), never a silent hard block —
// selling two units of the same product back to back, or two different
// customers buying the same item close together, is completely normal at a
// snack counter and must still go through once the admin confirms it.
const DUPLICATE_SCAN_COOLDOWN_MS = 3000;

class DuplicateScanWarning extends Error {}

// Each scan = one unit sold. Stock decrement uses a conditional updateMany
// (stock > 0) inside the transaction instead of read-then-write, so two
// scans landing at nearly the same moment can't both succeed against the
// last unit. The duplicate-scan check now runs inside the same transaction,
// immediately before the sale is created, instead of as a separate query
// beforehand — narrows (though doesn't fully eliminate) the window where two
// near-simultaneous scans could both pass the check before either commits.
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!parsed.data.confirmDuplicate) {
        const recentDuplicate = await tx.sale.findFirst({
          where: {
            productId: product.id,
            deletedAt: null,
            createdAt: { gte: new Date(Date.now() - DUPLICATE_SCAN_COOLDOWN_MS) },
          },
          orderBy: { createdAt: "desc" },
        });
        if (recentDuplicate) {
          throw new DuplicateScanWarning();
        }
      }

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
    if (error instanceof DuplicateScanWarning) {
      return NextResponse.json(
        {
          error: `"${product.name}" baru saja dicatat. Catat lagi sebagai penjualan baru?`,
          duplicateWarning: true,
        },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message === "OUT_OF_STOCK") {
      return NextResponse.json({ error: `Stok "${product.name}" habis.` }, { status: 400 });
    }
    throw error;
  }
}
