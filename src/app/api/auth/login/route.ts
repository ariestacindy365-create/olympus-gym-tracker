import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin, createSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { effectiveRole } from "@/lib/staffAccess";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and 4-digit PIN." }, { status: 400 });
  }

  const { email, pin } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPin(pin, user.pinHash))) {
    return NextResponse.json({ error: "Invalid email or PIN." }, { status: 401 });
  }

  // Staff roles only count for allowlisted emails; everyone else is a member.
  const role = effectiveRole(user);
  await createSessionCookie({ ...user, role });
  return NextResponse.json({ role });
}
