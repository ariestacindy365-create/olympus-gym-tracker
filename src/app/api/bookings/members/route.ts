import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// Admin looks up members by name to add them to a class: ?q=
export async function GET(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || (admin.role !== Role.ADMIN && admin.role !== Role.OWNER)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ members: [] });
  const rows = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT "id", "name" FROM "User" WHERE "role" = 'MEMBER' AND lower("name") LIKE ? ORDER BY "name" LIMIT 8`,
    `%${q.replace(/[%_]/g, "")}%`
  );
  return NextResponse.json({ members: rows });
}
