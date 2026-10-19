import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// Lets a member hide themselves from (or rejoin) the monthly leaderboard.
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (typeof body?.optOut !== "boolean") {
    return NextResponse.json({ error: "Pilihan tidak valid." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { leaderboardOptOut: body.optOut } });
  return NextResponse.json({ ok: true });
}
