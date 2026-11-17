import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BookingError, bookClass } from "@/lib/booking";
import { BOOKING_STATUS_LABEL } from "@/lib/bookingRules";
import { Role } from "@/generated/prisma/client";

// A member books a class: { day: "YYYY-MM-DD", sessionId }.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    const status = await bookClass({ userId: user.id, day: body?.day, sessionId: body?.sessionId });
    return NextResponse.json({ status, label: BOOKING_STATUS_LABEL[status] });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
