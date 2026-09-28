import "server-only";
import { prisma } from "@/lib/prisma";

// All "day key" fields (workoutDate, recordedDate, dueDate, etc.) are the
// gym's own Jakarta calendar day, stored as UTC midnight of that Y-M-D — not
// the server process's local calendar day. `new Date(y, m, d)` reads the
// *runtime's* local timezone, which is Jakarta on a coach's phone but UTC on
// Vercel; on a UTC server that silently shifted the day boundary to Jakarta
// midnight = UTC 17:00 the previous day, so anyone logging a set between
// midnight and 7am WIB got yesterday's date. classSessions.ts hit the same
// class of bug and fixed it with an explicit Asia/Jakarta formatter — this
// does the same, then keeps the existing UTC-midnight storage shape so nothing
// downstream that reads/formats these dates has to change.
const JAKARTA_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function jakartaYmd(date: Date): { year: number; month: number; day: number } {
  const parts = JAKARTA_DATE_FORMATTER.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function todayDateKey(): Date {
  const { year, month, day } = jakartaYmd(new Date());
  return new Date(Date.UTC(year, month - 1, day));
}

// Same convention as todayDateKey(), for a specific "YYYY-MM-DD" string (e.g.
// a coach picking a date to backfill) — so picking today's date always
// produces the exact same key todayDateKey() would, instead of colliding on
// a near-miss and creating a duplicate row.
export function dateKeyFromString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
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
