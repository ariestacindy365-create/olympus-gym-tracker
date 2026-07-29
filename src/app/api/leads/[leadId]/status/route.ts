import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateLeadStatusSchema } from "@/lib/validation";
import { scheduleTrialFollowUps } from "@/lib/leads";
import { Role } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/leads/[leadId]/status">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { leadId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateLeadStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
  }

  const { status } = parsed.data;

  // Booking itself happens in Fitquarter — moving a lead into TRIAL here
  // just marks the moment, and that moment is what H+1/H+3 are measured from.
  if (status === "TRIAL" && lead.status !== "TRIAL") {
    const trialMarkedAt = new Date();
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { status, trialMarkedAt },
    });
    await scheduleTrialFollowUps({ leadId, trialMarkedAt });
    return NextResponse.json({ lead: updated });
  }

  const updated = await prisma.lead.update({ where: { id: leadId }, data: { status } });
  return NextResponse.json({ lead: updated });
}
