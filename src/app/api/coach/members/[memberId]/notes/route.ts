import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

const noteSchema = z.object({
  body: z.string().trim().min(1, { error: "Tulis catatannya dulu." }).max(1000),
  context: z.string().trim().max(120).optional(),
});

export async function POST(request: NextRequest, ctx: RouteContext<"/api/coach/members/[memberId]/notes">) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { memberId } = await ctx.params;
  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  }

  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Catatan tidak valid." }, { status: 400 });
  }

  const note = await prisma.coachNote.create({
    data: { memberId, coachId: coach.id, body: parsed.data.body, context: parsed.data.context || null },
  });
  return NextResponse.json({
    note: {
      id: note.id,
      body: note.body,
      context: note.context,
      coachName: coach.name,
      createdAt: note.createdAt.toISOString(),
      readAt: null,
    },
  });
}
