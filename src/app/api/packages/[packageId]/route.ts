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
