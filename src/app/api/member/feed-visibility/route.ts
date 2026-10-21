import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, WorkoutVisibility } from "@/generated/prisma/client";

// Default "Dilihat oleh" for workouts the member saves.
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const v = body?.visibility as keyof typeof WorkoutVisibility | undefined;
  if (!v || !(v in WorkoutVisibility)) {
    return NextResponse.json({ error: "Pilihan tidak valid." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { feedVisibility: WorkoutVisibility[v] } });
  return NextResponse.json({ ok: true });
}
