import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser, hashPin, verifyPin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePinSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Masukkan PIN 4 digit yang valid." }, { status: 400 });
  }
  const { currentPin, newPin } = parsed.data;

  const isCurrentValid = await verifyPin(currentPin, user.pinHash);
  if (!isCurrentValid) {
    return NextResponse.json({ error: "PIN saat ini salah." }, { status: 401 });
  }

  const pinHash = await hashPin(newPin);
  await prisma.user.update({ where: { id: user.id }, data: { pinHash } });

  return NextResponse.json({ ok: true });
}
