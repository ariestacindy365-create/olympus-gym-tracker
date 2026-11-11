import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMembershipSchema } from "@/lib/validation";
import { nextStart } from "@/lib/membership";
import { Role } from "@/generated/prisma/client";

// Admin/owner adds a membership for a member who paid at the front desk (the
// payment itself is recorded on their lead as usual), so they can book classes.
export async function POST(request: NextRequest) {
  const staff = await getCurrentUser();
  if (!staff || (staff.role !== Role.ADMIN && staff.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createMembershipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }
  const [member, pkg] = await Promise.all([
    prisma.user.findUnique({ where: { id: parsed.data.userId } }),
    prisma.package.findUnique({ where: { id: parsed.data.packageId } }),
  ]);
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  }
  if (!pkg || !pkg.durationDays) {
    return NextResponse.json({ error: "Pilih paket yang punya durasi." }, { status: 400 });
  }
  // A chosen date starts at midnight in Jakarta.
  const startsAt = parsed.data.startsAt ? new Date(`${parsed.data.startsAt}T00:00:00+07:00`) : await nextStart(member.id);
  const membership = await prisma.membership.create({
    data: {
      userId: member.id,
      packageName: pkg.name,
      credits: pkg.credits,
      startsAt,
      expiresAt: addDays(startsAt, pkg.durationDays),
      createdById: staff.id,
    },
  });
  return NextResponse.json({ membership });
}
