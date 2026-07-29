import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTrialSchema } from "@/lib/validation";
import { dateKeyFromString } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/leads/[leadId]/trial">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { leadId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = createTrialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
  }

  const startDate = dateKeyFromString(parsed.data.startDate);
  const endDate = dateKeyFromString(parsed.data.endDate);
  if (endDate < startDate) {
    return NextResponse.json({ error: "Tanggal selesai harus setelah tanggal mulai." }, { status: 400 });
  }

  const [trial] = await prisma.$transaction([
    prisma.trial.create({
      data: { leadId, startDate, endDate, note: parsed.data.note },
    }),
    prisma.lead.update({ where: { id: leadId }, data: { status: "TRIAL" } }),
  ]);

  return NextResponse.json({ trial });
}
