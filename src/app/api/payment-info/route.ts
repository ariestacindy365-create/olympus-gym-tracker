import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentInfoSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

// Owner sets the bank account members transfer to.
export async function PUT(request: NextRequest) {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== Role.OWNER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  // Missing or broken JSON: say so in Indonesian, not zod's English.
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  const parsed = paymentInfoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  await prisma.gymPaymentInfo.upsert({ where: { id: 1 }, create: { id: 1, ...parsed.data }, update: parsed.data });
  return NextResponse.json({ ok: true });
}
