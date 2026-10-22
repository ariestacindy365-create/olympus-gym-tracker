import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSnapshot, writeProgramWeek, type SnapshotData } from "@/lib/programSave";
import { Role } from "@/generated/prisma/client";

// "Pakai di Minggu N": puts an old saved version of the coach's program
// into Minggu N (replacing what's there). The replaced version stays in the
// history, since it was snapshotted when it was saved.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/coach/programs/snapshots/[snapshotId]/restore">
) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { snapshotId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const weekNumber = Number(body?.weekNumber);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 4) {
    return NextResponse.json({ error: "Pilih Minggu 1-4." }, { status: 400 });
  }
  const snapshot = await prisma.programSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot || snapshot.coachId !== coach.id) {
    return NextResponse.json({ error: "Versi program tidak ditemukan." }, { status: 404 });
  }
  const data = snapshot.data as unknown as SnapshotData;
  const days = data?.days ?? [];
  if (!days.some((d) => d.slots.length > 0)) {
    return NextResponse.json({ error: "Versi ini kosong." }, { status: 400 });
  }

  // Snapshots keep movement names; a movement deleted since is re-created.
  const names = [...new Set(days.flatMap((d) => d.slots.map((s) => s.movementName.trim())))];
  await prisma.movement.createMany({ data: names.map((name) => ({ name })), skipDuplicates: true });
  const movements = await prisma.movement.findMany({ where: { name: { in: names } }, select: { id: true, name: true } });
  const idByName = new Map(movements.map((m) => [m.name, m.id]));

  // Separate transactions so the "before" snapshot gets an earlier timestamp
  // than the new version (now() is fixed for a whole transaction).
  await prisma.$transaction((tx) => ensureSnapshot(tx, coach.id, weekNumber));
  await prisma.$transaction(async (tx) => {
    await writeProgramWeek(
      tx,
      coach.id,
      weekNumber,
      days.map((d) => ({
        dayLabel: d.dayLabel,
        focusLabel: d.focusLabel,
        slots: d.slots
          .filter((s) => idByName.has(s.movementName.trim()))
          .map((s) => ({ ...s, movementId: idByName.get(s.movementName.trim())! })),
      }))
    );
  });
  return NextResponse.json({ ok: true, weekNumber });
}
