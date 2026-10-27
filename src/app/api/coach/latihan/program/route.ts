import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePersonalExercise } from "@/lib/personalTrainingExercises";
import { ProgramConflictError, assertProgramVersion, nextProgramDate } from "@/lib/programVersion";
import { personalTrainingSchema } from "@/lib/coachPersonalTraining";

export async function PUT(request: Request) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== "COACH") return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = personalTrainingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Isi nama hari, gerakan, target set (1–20), dan jumlah sesuai satuan. Gerakan tidak boleh duplikat dalam satu hari." }, { status: 400 });

  const ids = [...new Set(parsed.data.days.flatMap((day) => day.slots.map((slot) => slot.exerciseId)))];
  // Resolve all IDs before saving the template. Only chosen library movements
  // enter the shared logging dictionary; the rest stay in Movement.
  const exercises = await Promise.all(ids.map(resolvePersonalExercise));
  if (exercises.some((exercise) => !exercise)) return NextResponse.json({ error: "Ada gerakan yang tidak ditemukan. Muat ulang halaman." }, { status: 400 });
  const resolved = new Map(ids.map((id, index) => [id, exercises[index]!.id]));
  const days = parsed.data.days.map((day) => ({ ...day, slots: day.slots.map((slot) => ({ ...slot, exerciseId: resolved.get(slot.exerciseId)! })) }));
  if (days.some((day) => new Set(day.slots.map((slot) => slot.exerciseId)).size !== day.slots.length)) {
    return NextResponse.json({ error: "Gerakan dalam satu sesi tidak boleh duplikat." }, { status: 400 });
  }
  if (!body || !("expectedVersion" in body) || (body.expectedVersion !== null && typeof body.expectedVersion !== "string")) return NextResponse.json({ error: "Muat ulang program untuk mengambil versinya sebelum menyimpan." }, { status: 428 });
  try {
    const saved = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`${coach.id}:personal-program`}))`;
      const current = await tx.coachPersonalProgram.findUnique({ where: { coachId: coach.id } });
      assertProgramVersion(current?.updatedAt ?? null, body.expectedVersion);
      return tx.coachPersonalProgram.upsert({
        where: { coachId: coach.id },
        create: { coachId: coach.id, days },
        update: { days, updatedAt: nextProgramDate(current?.updatedAt) },
      });
    });
    return NextResponse.json({ days, exercises, version: saved.updatedAt.toISOString() });
  } catch (error) {
    if (error instanceof ProgramConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
