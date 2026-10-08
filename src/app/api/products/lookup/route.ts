import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// Read-only barcode lookup for the quick-sale popup: shows what was scanned
// (name, price, stock) before the admin picks a payment method. The sale
// itself still goes through POST /api/sales/scan.
export async function GET(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const barcode = request.nextUrl.searchParams.get("barcode")?.trim() ?? "";
  if (!barcode || barcode.length > 80) {
    return NextResponse.json({ error: "Barcode tidak valid." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { barcode },
    select: { id: true, name: true, barcode: true, price: true, stock: true, isActive: true },
  });
  if (!product || !product.isActive) {
    return NextResponse.json({ error: `Produk dengan barcode ${barcode} tidak ditemukan atau nonaktif.` }, { status: 404 });
  }
  if (product.stock <= 0) {
    return NextResponse.json({ error: `Stok "${product.name}" habis.` }, { status: 400 });
  }

  return NextResponse.json({ product });
}
