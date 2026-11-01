import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { savePtSessionSchema } from "@/lib/validation";
import { ownPtPackage } from "@/lib/ptAccess";

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

  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.ptSession.upsert({
      where: { packageId_number: { packageId, number: n } },
      create: { packageId, number: n, title: parsed.data.title || null },
      update: { title: parsed.data.title || null },
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
