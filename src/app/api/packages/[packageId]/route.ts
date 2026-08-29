import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePackageSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/packages/[packageId]">) {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== Role.OWNER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { packageId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updatePackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) {
    return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
  }

  const updated = await prisma.package.update({
    where: { id: packageId },
    data: parsed.data,
  });

  return NextResponse.json({ package: updated });
}

// Payment.packageName is a plain string snapshot, not a foreign key, so
// deleting a Package here never touches past receipts — safe to hard-delete
// rather than just deactivate.
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/packages/[packageId]">) {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== Role.OWNER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { packageId } = await ctx.params;
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) {
    return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
  }

  await prisma.package.delete({ where: { id: packageId } });

  return NextResponse.json({ ok: true });
}
