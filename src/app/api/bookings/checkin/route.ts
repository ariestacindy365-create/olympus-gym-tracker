import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BookingError, checkInByCode } from "@/lib/booking";
import { Role } from "@/generated/prisma/client";

// Front desk scans a member card: { code: "OLY-123456" }.
export async function POST(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || (admin.role !== Role.ADMIN && admin.role !== Role.OWNER)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    return NextResponse.json(await checkInByCode(typeof body?.code === "string" ? body.code : ""));
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
