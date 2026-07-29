import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { editLeadSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/leads/[leadId]">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { leadId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = editLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { waNumber: parsed.data.waNumber, name: parsed.data.name },
  });

  return NextResponse.json({ lead: updated });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/leads/[leadId]">) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { leadId } = await ctx.params;
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
  }
  if (lead.deletedAt) {
    return NextResponse.json({ error: "Lead sudah dihapus sebelumnya." }, { status: 409 });
  }

  // Soft delete — keeps the row (and its follow-up history) so the deletion
  // shows up in Riwayat instead of vanishing without a trace.
  await prisma.lead.update({
    where: { id: leadId },
    data: { deletedAt: new Date(), deletedById: admin.id },
  });

  return NextResponse.json({ ok: true });
}
