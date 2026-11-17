import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingError, bookClass } from "@/lib/booking";
import { BOOKING_STATUS_LABEL } from "@/lib/bookingRules";
import { Role } from "@/generated/prisma/client";

// Admin adds a member to a class from the desk: { userId, day, sessionId }.
// Allowed when full and without a membership (the desk decides).
export async function POST(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || (admin.role !== Role.ADMIN && admin.role !== Role.OWNER)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const member = typeof body?.userId === "string" ? await prisma.user.findFirst({ where: { id: body.userId, role: Role.MEMBER }, select: { id: true } }) : null;
  if (!member) return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  try {
    const status = await bookClass({ userId: member.id, day: body?.day, sessionId: body?.sessionId, addedById: admin.id });
    return NextResponse.json({ status, label: BOOKING_STATUS_LABEL[status] });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
