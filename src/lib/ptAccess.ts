import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

/**
 * The signed-in coach and the PT package they're changing. Only the
 * package's own coach may change it; other coaches can only look.
 */
export async function ownPtPackage(packageId: string) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) return { error: NextResponse.json({ error: "Not authorized." }, { status: 401 }) };
  const pkg = await prisma.ptPackage.findUnique({ where: { id: packageId } });
  if (!pkg || pkg.endedAt) return { error: NextResponse.json({ error: "Paket PT tidak ditemukan." }, { status: 404 }) };
  if (pkg.coachId !== coach.id) {
    return { error: NextResponse.json({ error: "Hanya coach PT paket ini yang bisa mengubahnya." }, { status: 403 }) };
  }
  return { coach, pkg };
}

/** Members (of the given ids) who are already someone's PT client. */
export async function membersAlreadyInPt(memberIds: string[]) {
  return prisma.ptMember.findMany({
    where: { memberId: { in: memberIds }, leftAt: null, package: { endedAt: null } },
    include: { member: { select: { name: true } } },
  });
}
