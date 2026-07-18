import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { dailyWorkoutSchema } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = dailyWorkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pilih gerakan atau tambahkan gerakan baru." }, { status: 400 });
  }
  const { exerciseId, newExerciseName } = parsed.data;

  let exercise = exerciseId
    ? await prisma.exercise.findUnique({ where: { id: exerciseId } })
    : await prisma.exercise.findUnique({ where: { name: newExerciseName! } });

  if (!exercise) {
    if (exerciseId) {
      return NextResponse.json({ error: "Gerakan tidak ditemukan." }, { status: 404 });
    }
    exercise = await prisma.exercise.create({ data: { name: newExerciseName! } });
  }

  const workoutDate = todayDateKey();
  const dailyWorkout = await prisma.dailyWorkout.upsert({
    where: { workoutDate },
    create: { workoutDate, exerciseId: exercise.id, coachId: coach.id },
    update: { exerciseId: exercise.id, coachId: coach.id },
  });

  return NextResponse.json({ dailyWorkout, exercise });
}
