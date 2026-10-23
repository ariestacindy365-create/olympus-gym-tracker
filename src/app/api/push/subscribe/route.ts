import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const subSchema = z.object({
  // Push services are always https; anything else would make the server
  // POST to an address of the client's choosing.
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

// This phone/browser wants push notifications for the signed-in user.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const parsed = subSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Langganan notifikasi tidak valid." }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  // An endpoint belongs to one browser; if someone else logs in on it, it moves to them.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.endpoint === "string") {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: user.id } });
  }
  return NextResponse.json({ ok: true });
}
