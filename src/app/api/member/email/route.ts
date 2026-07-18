import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changeEmailSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "Email itu sudah dipakai akun lain." }, { status: 409 });
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { email } });

  return NextResponse.json({ email: updated.email });
}
