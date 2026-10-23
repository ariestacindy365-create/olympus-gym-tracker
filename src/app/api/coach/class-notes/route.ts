import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notify";
import { Role } from "@/generated/prisma/client";

const schema = z.object({
  memberIds: z.array(z.string().min(1)).min(1).max(100),
  body: z.string().trim().min(1, { error: "Tulis catatannya dulu." }).max(1000),
  context: z.string().trim().max(120).optional(),
});

// One coach note to everyone in a class (the dashboard's "Rekap kelas").
export async function POST(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Catatan tidak valid." }, { status: 400 });
  }
  const { body, context } = parsed.data;
  const members = await prisma.user.findMany({
    where: { id: { in: [...new Set(parsed.data.memberIds)] }, role: Role.MEMBER },
    select: { id: true },
  });
  if (members.length === 0) return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  await prisma.coachNote.createMany({
    data: members.map((m) => ({ memberId: m.id, coachId: coach.id, body, context: context || null })),
  });
  after(() =>
    notifyUsers(
      members.map((m) => m.id),
      { type: "COACH_NOTE", title: `📝 Catatan dari ${coach.name}`, body, url: "/member/dashboard" }
    )
  );
  return NextResponse.json({ sent: members.length });
}
