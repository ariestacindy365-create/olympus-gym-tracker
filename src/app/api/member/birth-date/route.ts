import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jakartaToday, parseBirthDate } from "@/lib/birthDate";
import { Role } from "@/generated/prisma/client";

// The member's date of birth ({ birthDate: "YYYY-MM-DD" }).
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = parseBirthDate(typeof body?.birthDate === "string" ? body.birthDate : "", jakartaToday());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { birthDate: parsed.date } });
  return NextResponse.json({ ok: true });
}
