import "server-only";
import { prisma } from "@/lib/prisma";

export function todayDateKey(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Same local-midnight convention as todayDateKey(), for a specific
// "YYYY-MM-DD" string (e.g. a coach picking a date to backfill) — so
// picking today's date always produces the exact same key todayDateKey()
// would, instead of colliding on a near-miss and creating a duplicate row.
export function dateKeyFromString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export async function getTodayDailyWorkout() {
  return prisma.dailyWorkout.findUnique({
    where: { workoutDate: todayDateKey() },
    include: { exercise: true },
  });
}

export async function getTodaySets(memberId: string, exerciseId: string) {
  return prisma.setEntry.findMany({
    where: { memberId, exerciseId, workoutDate: todayDateKey() },
    orderBy: { setNumber: "asc" },
  });
}

// All sets from the member's most recent day (before today) for this
// exercise, for the "last time" reference panel.
export async function getLastSets(memberId: string, exerciseId: string) {
  const lastDay = await prisma.setEntry.findFirst({
    where: { memberId, exerciseId, workoutDate: { lt: todayDateKey() } },
    orderBy: { workoutDate: "desc" },
    select: { workoutDate: true },
  });
  if (!lastDay) return [];

  return prisma.setEntry.findMany({
    where: { memberId, exerciseId, workoutDate: lastDay.workoutDate },
    orderBy: { setNumber: "asc" },
  });
}
