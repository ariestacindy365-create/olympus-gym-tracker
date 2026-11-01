import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPtPackageSchema } from "@/lib/validation";
import { membersAlreadyInPt } from "@/lib/ptAccess";
import { Role } from "@/generated/prisma/client";

// "+ Tambah klien PT": a package for one member, or a couple / small group
// trained together, owned by the coach who creates it.
export async function POST(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const parsed = createPtPackageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pilih minimal 1 member." }, { status: 400 });
  const memberIds = [...new Set(parsed.data.memberIds)];

  const members = await prisma.user.findMany({ where: { id: { in: memberIds }, role: Role.MEMBER }, select: { id: true } });
  if (members.length !== memberIds.length) return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  const taken = await membersAlreadyInPt(memberIds);
  if (taken.length > 0) {
    return NextResponse.json({ error: `${taken.map((t) => t.member.name).join(", ")} sudah jadi klien PT.` }, { status: 409 });
  }

  const pkg = await prisma.ptPackage.create({
    data: { coachId: coach.id, name: parsed.data.name || null, members: { create: memberIds.map((memberId) => ({ memberId })) } },
  });
  return NextResponse.json({ package: pkg });
}
