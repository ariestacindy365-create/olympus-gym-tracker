import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateKeyFromString } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

export type StockMovementType = "RESTOCK" | "SALE" | "SALE_DELETED" | "INITIAL" | "EDIT";

export interface StockMovement {
  id: string;
  type: StockMovementType;
  productId: string;
  productName: string;
  /** +n stock in, -n stock out. */
  change: number;
  /** Known for restocks and adjustments; sales don't store it. */
  stockAfter: number | null;
  by: string | null;
  at: string;
}

// Stock in/out for a date range (Riwayat tab on Kasir), merged from the
// tables that move stock: Restock (+), StockAdjustment (±, starting stock
// and direct edits), Sale (-1 each) and a deleted Sale (+1, stock returned).
// Same ADMIN+OWNER visibility as the sales history, view-only.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const productId = searchParams.get("productId") || undefined;
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
  }
  const range = { gte: dateKeyFromString(from), lt: addDays(dateKeyFromString(to), 1) };

  const [restocks, adjustments, sales, deletedSales, products] = await Promise.all([
    prisma.restock.findMany({
      where: { createdAt: range, productId },
      include: { product: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
    prisma.stockAdjustment.findMany({
      where: { createdAt: range, productId },
      include: { product: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
    // Deleted sales still took the unit out when they were made; their
    // return shows up as its own SALE_DELETED line below.
    prisma.sale.findMany({
      where: { createdAt: range, productId },
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.sale.findMany({
      where: { deletedAt: range, productId },
      include: { deletedBy: { select: { name: true } } },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, stock: true, isActive: true } }),
  ]);

  const movements: StockMovement[] = [
    ...restocks.map((r) => ({
      id: `r-${r.id}`,
      type: "RESTOCK" as const,
      productId: r.productId,
      productName: r.product.name,
      change: r.quantity,
      stockAfter: r.stockAfter,
      by: r.createdBy.name,
      at: r.createdAt.toISOString(),
    })),
    ...adjustments.map((a) => ({
      id: `a-${a.id}`,
      type: a.reason,
      productId: a.productId,
      productName: a.product.name,
      change: a.change,
      stockAfter: a.stockAfter,
      by: a.createdBy.name,
      at: a.createdAt.toISOString(),
    })),
    ...sales.map((s) => ({
      id: `s-${s.id}`,
      type: "SALE" as const,
      productId: s.productId,
      productName: s.productName,
      change: -1,
      stockAfter: null,
      by: s.createdBy.name,
      at: s.createdAt.toISOString(),
    })),
    ...deletedSales.map((s) => ({
      id: `d-${s.id}`,
      type: "SALE_DELETED" as const,
      productId: s.productId,
      productName: s.productName,
      change: 1,
      stockAfter: null,
      by: s.deletedBy?.name ?? null,
      at: (s.deletedAt as Date).toISOString(),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return NextResponse.json({ movements, products });
}
