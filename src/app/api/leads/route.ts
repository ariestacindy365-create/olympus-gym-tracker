import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLeadSchema } from "@/lib/validation";
import { normalizeWaNumber } from "@/lib/whatsapp";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const waNumberNormalized = normalizeWaNumber(parsed.data.waNumber);
  const existing = await prisma.lead.findFirst({
    where: { waNumberNormalized, deletedAt: null },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: `Nomor ini sudah tercatat sebagai "${existing.name}".`,
        existingLeadId: existing.id,
        existingLeadName: existing.name,
      },
      { status: 409 }
    );
  }

  const lead = await prisma.lead.create({
    data: {
      waNumber: parsed.data.waNumber,
      waNumberNormalized,
      name: parsed.data.name,
      capturedById: admin.id,
    },
  });

  return NextResponse.json({ lead });
}
