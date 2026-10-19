import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/coach/members/[memberId]/notes/[noteId]">) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { memberId, noteId } = await ctx.params;
  const { count } = await prisma.coachNote.deleteMany({ where: { id: noteId, memberId } });
  if (count === 0) {
    return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
