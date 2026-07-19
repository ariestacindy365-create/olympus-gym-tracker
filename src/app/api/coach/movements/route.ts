import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMovementSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createMovementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data gerakan tidak valid." }, { status: 400 });
  }

  const existing = await prisma.movement.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: "Gerakan dengan nama itu sudah ada." }, { status: 409 });
  }

  const movement = await prisma.movement.create({
    data: {
      name: parsed.data.name,
      primaryMuscle: parsed.data.primaryMuscle,
      secondaryMuscle: parsed.data.secondaryMuscle ?? null,
      category: parsed.data.category,
      equipment: parsed.data.equipment,
      repRangeHint: parsed.data.repRangeHint ?? null,
      setRangeHint: parsed.data.setRangeHint ?? null,
    },
  });

  return NextResponse.json({ movement });
}
