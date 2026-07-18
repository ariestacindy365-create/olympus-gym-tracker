import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser, hashPin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMemberSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

const DEFAULT_PIN = "1111";

export async function POST(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Masukkan email yang valid." }, { status: 400 });
  }
  const { email, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Sudah ada akun dengan email itu." }, { status: 409 });
  }

  const member = await prisma.user.create({
    data: {
      email,
      name: name && name.length > 0 ? name : email.split("@")[0],
      pinHash: await hashPin(DEFAULT_PIN),
      role: Role.MEMBER,
    },
  });

  return NextResponse.json({ member: { id: member.id, name: member.name, email: member.email } });
}
