import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changeEmailSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";
import { isStaffEmailAllowed } from "@/lib/staffAccess";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changeEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Masukkan email yang valid." }, { status: 400 });
  }
  const { email } = parsed.data;

  // A staff-role account outside the allowlist runs as a member; don't let
  // it regain staff access by moving onto a (still unused) allowlisted email.
  const stored = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (stored && stored.role !== Role.MEMBER && isStaffEmailAllowed(stored.role, email)) {
    return NextResponse.json({ error: "Email itu tidak bisa dipakai." }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "Email itu sudah dipakai akun lain." }, { status: 409 });
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { email } });

  return NextResponse.json({ email: updated.email });
}
