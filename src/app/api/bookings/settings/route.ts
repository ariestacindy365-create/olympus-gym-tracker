import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// Owner sets the places per class: { quota } (1–100).
export async function PATCH(request: NextRequest) {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== Role.OWNER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const quota = Number(body?.quota);
  if (!Number.isInteger(quota) || quota < 1 || quota > 100) return NextResponse.json({ error: "Kuota harus 1–100." }, { status: 400 });
  await prisma.bookingSettings.upsert({ where: { id: "default" }, create: { id: "default", quota }, update: { quota } });
  return NextResponse.json({ quota });
}
