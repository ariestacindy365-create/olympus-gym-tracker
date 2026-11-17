import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BookingError, cancelBooking, setBookingStatus } from "@/lib/booking";
import { Role } from "@/generated/prisma/client";

// The member cancels their own booking (or leaves the waiting list).
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/bookings/[bookingId]">) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { bookingId } = await ctx.params;
  try {
    await cancelBooking({ userId: user.id, bookingId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

// Admin at the desk: { action: "ATTENDED" | "NO_SHOW" | "REMOVE" }.
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/bookings/[bookingId]">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { bookingId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "ATTENDED" && action !== "NO_SHOW" && action !== "REMOVE") return NextResponse.json({ error: "Pilihan tidak valid." }, { status: 400 });
  try {
    await setBookingStatus({ bookingId, action });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
