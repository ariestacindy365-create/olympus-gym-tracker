import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeFollowUpSchema } from "@/lib/validation";
import { scheduleMemberFollowUps } from "@/lib/leads";
import { Role, Prisma } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/followups/[followUpId]">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { followUpId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = completeFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const followUp = await prisma.followUp.findUnique({ where: { id: followUpId } });
  if (!followUp) {
    return NextResponse.json({ error: "Follow up tidak ditemukan." }, { status: 404 });
  }
  if (followUp.status !== "PENDING") {
    return NextResponse.json({ error: "Follow up sudah diproses sebelumnya." }, { status: 409 });
  }

  const { outcome, note } = parsed.data;
  const now = new Date();

  const lead = await prisma.lead.findUnique({ where: { id: followUp.leadId } });
  const becomingMember = outcome === "CONVERTED" && lead?.status !== "MEMBER";

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.followUp.update({
      where: { id: followUpId },
      data: { status: "DONE", completedAt: now, completedById: admin.id, note },
    }),
  ];

  if (outcome === "CONVERTED") {
    ops.push(prisma.lead.update({ where: { id: followUp.leadId }, data: { status: "MEMBER", convertedAt: now } }));
  } else if (outcome === "LOST") {
    ops.push(prisma.lead.update({ where: { id: followUp.leadId }, data: { status: "LOST" } }));
  }

  const [updatedFollowUp] = await prisma.$transaction(ops);

  if (becomingMember) {
    await scheduleMemberFollowUps({ leadId: followUp.leadId, convertedAt: now });
  }

  return NextResponse.json({ followUp: updatedFollowUp });
}
