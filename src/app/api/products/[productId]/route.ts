import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProductSchema } from "@/lib/validation";
import { Prisma, Role } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/products/[productId]">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { productId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }

  if (parsed.data.barcode && parsed.data.barcode !== product.barcode) {
    const existing = await prisma.product.findUnique({ where: { barcode: parsed.data.barcode } });
    if (existing) {
      return NextResponse.json({ error: `Barcode ini sudah dipakai produk "${existing.name}".` }, { status: 409 });
    }
  }

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: parsed.data,
    });
    return NextResponse.json({ product: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `Barcode ini sudah dipakai produk lain.` }, { status: 409 });
    }
    throw error;
  }
}
