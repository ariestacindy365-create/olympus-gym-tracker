import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeTrialSchema } from "@/lib/validation";
import { isSameLocalDay, scheduleTrialFollowUps } from "@/lib/leads";
import { Role } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/trials/[trialId]">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { trialId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = completeTrialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const trial = await prisma.trial.findUnique({ where: { id: trialId } });
  if (!trial) {
    return NextResponse.json({ error: "Trial tidak ditemukan." }, { status: 404 });
  }
  if (trial.converted !== null) {
    return NextResponse.json({ error: "Trial sudah diproses sebelumnya." }, { status: 409 });
  }

  const { converted, note } = parsed.data;
  const now = new Date();

  if (converted) {
    const discountGiven = isSameLocalDay(now, trial.endDate);
    const [updatedTrial] = await prisma.$transaction([
      prisma.trial.update({
        where: { id: trialId },
        data: { converted: true, convertedAt: now, discountGiven, note },
      }),
      prisma.lead.update({ where: { id: trial.leadId }, data: { status: "CONVERTED" } }),
    ]);
    return NextResponse.json({ trial: updatedTrial });
  }

  const updatedTrial = await prisma.trial.update({
    where: { id: trialId },
    data: { converted: false, note },
  });
  await scheduleTrialFollowUps({ leadId: trial.leadId, trialId: trial.id, endDate: trial.endDate });

  return NextResponse.json({ trial: updatedTrial });
}
