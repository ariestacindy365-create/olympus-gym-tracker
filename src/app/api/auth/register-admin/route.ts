import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin, createSessionCookie } from "@/lib/auth";
import { registerAdminSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const inviteCode = process.env.ADMIN_INVITE_CODE;
  if (!inviteCode) {
    return NextResponse.json({ error: "Registrasi admin belum diaktifkan." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Isi nama, email, PIN, dan kode registrasi." },
      { status: 400 }
    );
  }
  const { name, email, pin, inviteCode: submittedCode } = parsed.data;

  if (submittedCode !== inviteCode) {
    return NextResponse.json({ error: "Kode registrasi admin salah." }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Sudah ada akun dengan email itu." }, { status: 409 });
  }

  const pinHash = await hashPin(pin);
  const user = await prisma.user.create({
    data: { name, email, pinHash, role: Role.ADMIN },
  });
  await prisma.target.create({ data: { adminId: user.id } });

  await createSessionCookie(user);
  return NextResponse.json({ role: user.role });
}
