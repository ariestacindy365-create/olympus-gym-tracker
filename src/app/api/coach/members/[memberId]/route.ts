import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { editMemberNameSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/coach/members/[memberId]">
) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = editMemberNameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Masukkan nama yang valid." }, { status: 400 });
  }

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: memberId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ member: { id: updated.id, name: updated.name, email: updated.email } });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/coach/members/[memberId]">
) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId } = await ctx.params;
  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.personalRecord.deleteMany({ where: { memberId } }),
    prisma.setEntry.deleteMany({ where: { memberId } }),
    prisma.user.delete({ where: { id: memberId } }),
  ]);

  return NextResponse.json({ ok: true });
}
