import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTargetSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/targets/[adminId]">) {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== Role.OWNER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { adminId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateTargetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin tidak ditemukan." }, { status: 404 });
  }

  const target = await prisma.target.upsert({
    where: { adminId },
    update: parsed.data,
    create: { adminId, ...parsed.data },
  });

  return NextResponse.json({ target });
}
