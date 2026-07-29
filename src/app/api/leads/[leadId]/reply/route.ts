import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addReplySchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/leads/[leadId]/reply">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { leadId } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const parsed = addReplySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
  }

  const replyCount = lead.replyCount + parsed.data.count;
  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { replyCount },
  });

  return NextResponse.json({ lead: updated });
}
