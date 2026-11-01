import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ownPtPackage } from "@/lib/ptAccess";

// "Lepas dari PT": the member goes back to training with the class. Their
// sets and the package's sessions stay; the package ends with its last member.
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/coach/pt/[packageId]/members/[memberId]">) {
  const { packageId, memberId } = await ctx.params;
  const own = await ownPtPackage(packageId);
  if (own.error) return own.error;

  const now = new Date();
  const ended = await prisma.$transaction(async (tx) => {
    const { count } = await tx.ptMember.updateMany({ where: { packageId, memberId, leftAt: null }, data: { leftAt: now } });
    if (count === 0) return null;
    const left = await tx.ptMember.count({ where: { packageId, leftAt: null } });
    if (left === 0) await tx.ptPackage.update({ where: { id: packageId }, data: { endedAt: now } });
    return left === 0;
  });
  if (ended === null) return NextResponse.json({ error: "Member ini bukan klien di paket ini." }, { status: 404 });
  return NextResponse.json({ ok: true, ended });
}
