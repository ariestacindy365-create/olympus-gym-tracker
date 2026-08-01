import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFollowUpSchema } from "@/lib/validation";
import { dateKeyFromString } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

// Lets an admin schedule a one-off follow-up for an arbitrary date — e.g.
// the lead asked to be followed up again next week/month. Shows up in the
// same dashboard/Riwayat queues as the auto-generated H1/H3/H7/H21 ones.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/leads/[leadId]/followups">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { leadId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = createFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.deletedAt) {
    return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
  }

  const followUp = await prisma.followUp.create({
    data: {
      leadId,
      type: "CUSTOM",
      dueDate: dateKeyFromString(parsed.data.dueDate),
      note: parsed.data.note,
    },
  });

  return NextResponse.json({ followUp });
}
