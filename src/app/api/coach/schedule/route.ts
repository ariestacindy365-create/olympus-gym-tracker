import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLASS_SESSIONS } from "@/lib/classSessions";
import { Role } from "@/generated/prisma/client";

const schema = z.object({
  weekday: z.number().int().min(1).max(6),
  sessionId: z.string().refine((id) => CLASS_SESSIONS.some((s) => s.id === id)),
  coachId: z.string().nullable(),
});

// Sets who teaches one class time on one weekday (null = no class).
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data jadwal tidak valid." }, { status: 400 });
  const { weekday, sessionId, coachId } = parsed.data;
  if (coachId) {
    const coach = await prisma.user.findFirst({ where: { id: coachId, role: Role.COACH } });
    if (!coach) return NextResponse.json({ error: "Coach tidak ditemukan." }, { status: 404 });
  }
  await prisma.classSlot.upsert({
    where: { weekday_sessionId: { weekday, sessionId } },
    create: { weekday, sessionId, coachId },
    update: { coachId },
  });
  return NextResponse.json({ ok: true });
}
