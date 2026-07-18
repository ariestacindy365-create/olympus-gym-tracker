import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser, hashPin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

const DEFAULT_PIN = "1111";

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/coach/members/[memberId]/reset-pin">
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

  await prisma.user.update({
    where: { id: memberId },
    data: { pinHash: await hashPin(DEFAULT_PIN) },
  });

  return NextResponse.json({ ok: true, pin: DEFAULT_PIN });
}
