import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Sync of the movement dictionary with the Activa gym tracker. Activa drives
// it: GET pulls Olympus's movements, POST adds the ones Olympus is missing.
// Matched by name (case-insensitive); only additions — renames and deletes
// stay local to each app. Protected by a shared GERAKAN_SYNC_TOKEN.

function authorized(request: NextRequest): boolean {
  const token = process.env.GERAKAN_SYNC_TOKEN;
  if (!token) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const field = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s || null;
};

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const movements = await prisma.movement.findMany({
    orderBy: { name: "asc" },
    select: { name: true, primaryMuscle: true, secondaryMuscle: true, category: true, equipment: true },
  });
  return NextResponse.json({ movements });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const incoming: unknown[] = Array.isArray(body?.movements) ? body.movements.slice(0, 500) : [];
  const existing = new Set((await prisma.movement.findMany({ select: { name: true } })).map((m) => norm(m.name)));
  const added: string[] = [];
  for (const raw of incoming) {
    const m = raw as Record<string, unknown>;
    const name = field(m?.name, 80)?.replace(/\s+/g, " ");
    if (!name || name.length < 2 || existing.has(norm(name))) continue;
    await prisma.movement.create({
      data: {
        name,
        primaryMuscle: field(m.primaryMuscle, 40),
        secondaryMuscle: field(m.secondaryMuscle, 40),
        category: field(m.category, 40),
        equipment: field(m.equipment, 40),
      },
    });
    existing.add(norm(name));
    added.push(name);
  }
  return NextResponse.json({ added });
}
