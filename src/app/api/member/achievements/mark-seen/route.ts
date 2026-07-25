import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAchievementsSeen } from "@/lib/achievements";
import { Role } from "@/generated/prisma/client";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  await markAchievementsSeen(user.id);

  return NextResponse.json({ ok: true });
}
