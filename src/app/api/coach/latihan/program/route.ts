import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePersonalExercise } from "@/lib/personalTrainingExercises";
import { personalTrainingSchema } from "@/lib/coachPersonalTraining";

export async function PUT(request: Request) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== "COACH") return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  const parsed = personalTrainingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Isi nama hari, gerakan, target set (1–20), dan reps (1–200). Gerakan tidak boleh duplikat dalam satu hari." }, { status: 400 });

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
  await prisma.coachPersonalProgram.upsert({
    where: { coachId: coach.id },
    create: { coachId: coach.id, days },
    update: { days },
  });
  return NextResponse.json({ days, exercises });
}
