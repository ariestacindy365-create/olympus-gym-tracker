import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { membersAlreadyInPt, ownPtPackage } from "@/lib/ptAccess";
import { Role } from "@/generated/prisma/client";

// Add a member to the package (a single client becomes a couple / group).
export async function POST(request: NextRequest, ctx: RouteContext<"/api/coach/pt/[packageId]/members">) {
  const { packageId } = await ctx.params;
  const own = await ownPtPackage(packageId);
  if (own.error) return own.error;
  const body = await request.json().catch(() => null);
  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { role: true } });
  if (!member || member.role !== Role.MEMBER) return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  const taken = await membersAlreadyInPt([memberId]);
  if (taken.length > 0) return NextResponse.json({ error: `${taken[0].member.name} sudah jadi klien PT.` }, { status: 409 });

  await prisma.ptMember.upsert({
    where: { packageId_memberId: { packageId, memberId } },
    create: { packageId, memberId },
    update: { leftAt: null, joinedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
