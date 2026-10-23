import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// On/off for the morning "program hari ini" reminder, or (kind: "reminder")
// the evening "jangan lupa catat" one.
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.on !== "boolean") return NextResponse.json({ error: "Pilihan tidak valid." }, { status: 400 });
  const data = body.kind === "reminder" ? { notifyReminder: body.on } : { notifyProgram: body.on };
  await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true });
}
