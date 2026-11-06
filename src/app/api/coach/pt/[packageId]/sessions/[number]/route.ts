import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { savePtSessionSchema } from "@/lib/validation";
import { ownPtPackage } from "@/lib/ptAccess";
import { dateKeyFromString, todayDateKey } from "@/lib/workout";
import { recomputeExerciseRecords } from "@/lib/recomputeRecords";
import { isClosedDay } from "@/lib/ptSession";
import { idsByNameIgnoringCase } from "@/lib/sqlite";

async function sessionNumber(ctx: RouteContext<"/api/coach/pt/[packageId]/sessions/[number]">) {
  const { packageId, number } = await ctx.params;
  const n = Number(number);
  return { packageId, n: Number.isInteger(n) && n >= 1 && n <= 500 ? n : null };
}

// Writes Sesi N of the package's program (the next new one, or one written
// before). Numbers keep running; a couple's sessions are shared.
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/coach/pt/[packageId]/sessions/[number]">) {
  const { packageId, n } = await sessionNumber(ctx);
  const own = await ownPtPackage(packageId);
  if (own.error) return own.error;
  if (n === null) return NextResponse.json({ error: "Nomor sesi tidak valid." }, { status: 400 });
  const parsed = savePtSessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Periksa isi gerakan sesi ini." }, { status: 400 });

  const last = await prisma.ptSession.aggregate({ where: { packageId }, _max: { number: true } });
  if (n > (last._max.number ?? 0) + 1) return NextResponse.json({ error: "Tulis sesi sebelumnya dulu." }, { status: 400 });

  const movementIds = [...new Set(parsed.data.slots.map((s) => s.movementId))];
  if ((await prisma.movement.count({ where: { id: { in: movementIds } } })) !== movementIds.length) {
    return NextResponse.json({ error: "Ada gerakan yang tidak ada di library." }, { status: 400 });
  }

  if (parsed.data.scheduledOn && isClosedDay(parsed.data.scheduledOn)) {
    return NextResponse.json({ error: "Olympus tutup hari Minggu. Pilih hari lain untuk jadwal sesi ini." }, { status: 400 });
  }
  const schedule = {
    scheduledOn: parsed.data.scheduledOn ? dateKeyFromString(parsed.data.scheduledOn) : null,
    // A time only means something with a day.
    scheduledTime: parsed.data.scheduledOn ? parsed.data.scheduledTime || null : null,
  };
  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.ptSession.upsert({
      where: { packageId_number: { packageId, number: n } },
      create: { packageId, number: n, title: parsed.data.title || null, ...schedule },
      update: { title: parsed.data.title || null, ...schedule },
    });
    await tx.ptSlot.deleteMany({ where: { sessionId: s.id } });
    await tx.ptSlot.createMany({
      data: parsed.data.slots.map((slot, order) => ({
        sessionId: s.id,
        order,
        slotLabel: slot.slotLabel || null,
        movementId: slot.movementId,
        sets: slot.sets ?? null,
        repTarget: slot.repTarget || null,
        note: slot.note || null,
        roundScheme: slot.roundScheme || null,
      })),
    });
    return s;
  });
  return NextResponse.json({ session });
}

// Only the last session, and only before it's been trained.
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/coach/pt/[packageId]/sessions/[number]">) {
  const { packageId, n } = await sessionNumber(ctx);
  const own = await ownPtPackage(packageId);
  if (own.error) return own.error;
  const session = n === null ? null : await prisma.ptSession.findUnique({ where: { packageId_number: { packageId, number: n } } });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  const last = await prisma.ptSession.aggregate({ where: { packageId }, _max: { number: true } });
  if (session.heldOn || session.number !== last._max.number) {
    return NextResponse.json({ error: "Hanya sesi terakhir yang belum dilatih yang bisa dihapus." }, { status: 409 });
  }
  await prisma.ptSession.delete({ where: { id: session.id } });
  return NextResponse.json({ ok: true });
}

/**
 * The day a session was trained. `heldOn: "YYYY-MM-DD"` moves it, and the
 * clients' sets of that session go with it (renumbered after any sets they
 * already have that day, PRs worked out again). `heldOn: null` marks it as
 * not trained yet, only while it has no sets.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/coach/pt/[packageId]/sessions/[number]">) {
  const { packageId, n } = await sessionNumber(ctx);
  const own = await ownPtPackage(packageId);
  if (own.error) return own.error;
  const body = await request.json().catch(() => null);
  const raw = body?.heldOn;
  if (raw !== null && !(typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw))) {
    return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
  }
  const session =
    n === null
      ? null
      : await prisma.ptSession.findUnique({
          where: { packageId_number: { packageId, number: n } },
          include: { slots: { include: { movement: { select: { name: true } } } }, package: { include: { members: { select: { memberId: true } } } } },
        });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  if (!session.heldOn) return NextResponse.json({ error: "Sesi ini belum dilatih." }, { status: 409 });

  const from = session.heldOn;
  const memberIds = session.package.members.map((m) => m.memberId);
  const names = [...new Set(session.slots.map((s) => s.movement.name.trim()))];
  const exerciseIds = await idsByNameIgnoringCase("Exercise", names);
  const sessionSets = { memberId: { in: memberIds }, exerciseId: { in: exerciseIds }, workoutDate: from };

  if (raw === null) {
    if ((await prisma.setEntry.count({ where: sessionSets })) > 0) {
      return NextResponse.json({ error: "Sesi ini sudah ada setnya. Hapus setnya dulu, atau ubah tanggalnya." }, { status: 409 });
    }
    await prisma.ptSession.update({ where: { id: session.id }, data: { heldOn: null } });
    return NextResponse.json({ ok: true, heldOn: null, moved: 0 });
  }

  const to = dateKeyFromString(raw);
  if (to.toISOString().slice(0, 10) !== raw) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
  if (to.getTime() > todayDateKey().getTime()) return NextResponse.json({ error: "Tanggal dilatih tidak boleh di masa depan." }, { status: 400 });
  if (isClosedDay(raw)) return NextResponse.json({ error: "Olympus tutup hari Minggu. Pilih hari lain." }, { status: 400 });
  if (to.getTime() === from.getTime()) return NextResponse.json({ ok: true, heldOn: raw, moved: 0 });
  const clash = await prisma.ptSession.findFirst({ where: { packageId, heldOn: to, id: { not: session.id } }, select: { number: true } });
  if (clash) return NextResponse.json({ error: `Sesi ${clash.number} sudah dilatih di tanggal itu.` }, { status: 409 });

  const moved = await prisma.$transaction(async (tx) => {
    const sets = await tx.setEntry.findMany({ where: sessionSets, orderBy: [{ setNumber: "asc" }] });
    const touched = new Set<string>();
    for (const s of sets) {
      // After the member's sets of this movement already on the new day.
      const last = await tx.setEntry.aggregate({ where: { memberId: s.memberId, exerciseId: s.exerciseId, workoutDate: to }, _max: { setNumber: true } });
      await tx.setEntry.update({ where: { id: s.id }, data: { workoutDate: to, setNumber: (last._max.setNumber ?? 0) + 1 } });
      touched.add(`${s.memberId}|${s.exerciseId}`);
    }
    for (const key of touched) {
      const [memberId, exerciseId] = key.split("|");
      await recomputeExerciseRecords(tx, memberId, exerciseId);
    }
    // A saved workout whose day is now empty moves with its sets, unless the new day has one.
    for (const memberId of memberIds) {
      const left = await tx.setEntry.count({ where: { memberId, workoutDate: from } });
      const taken = await tx.workout.findUnique({ where: { memberId_workoutDate: { memberId, workoutDate: to } }, select: { id: true } });
      if (left === 0 && !taken) await tx.workout.updateMany({ where: { memberId, workoutDate: from }, data: { workoutDate: to } });
    }
    await tx.ptSession.update({ where: { id: session.id }, data: { heldOn: to } });
    return sets.length;
  });
  return NextResponse.json({ ok: true, heldOn: raw, moved });
}
