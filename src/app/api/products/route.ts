import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/lib/validation";
import { Prisma, Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { barcode: parsed.data.barcode } });
  if (existing) {
    return NextResponse.json({ error: `Barcode ini sudah dipakai produk "${existing.name}".` }, { status: 409 });
  }

  // The findUnique check above is just a fast path for the common case —
  // two admins adding a product with the same barcode at nearly the same
  // moment could both pass it, so the @unique constraint itself is the real
  // guard; catch its violation here instead of letting it surface as a raw 500.
  try {
    const product = await prisma.product.create({
      data: {
        name: parsed.data.name,
        barcode: parsed.data.barcode,
        price: parsed.data.price,
        stock: parsed.data.stock ?? 0,
      },
    });
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `Barcode ini sudah dipakai produk lain.` }, { status: 409 });
    }
    throw error;
  }
}
