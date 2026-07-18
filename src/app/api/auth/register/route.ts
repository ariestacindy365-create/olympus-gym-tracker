import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin, createSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your name, a valid email, and a 4-digit PIN." },
      { status: 400 }
    );
  }
  const { name, email, pin } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const pinHash = await hashPin(pin);
  const user = await prisma.user.create({
    data: { name, email, pinHash, role: Role.MEMBER },
  });

  await createSessionCookie(user);
  return NextResponse.json({ role: user.role });
}
