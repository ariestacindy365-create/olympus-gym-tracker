import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// On/off for the morning "program hari ini" reminder.
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.on !== "boolean") return NextResponse.json({ error: "Pilihan tidak valid." }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { notifyProgram: body.on } });
  return NextResponse.json({ ok: true });
}
