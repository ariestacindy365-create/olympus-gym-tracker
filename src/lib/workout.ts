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

/** How many days back a member may still fill in a workout they forgot to log. */
export const BACKFILL_DAYS = 3;

/**
 * The day a member may log sets for: today when `value` is empty or today,
 * one of the last BACKFILL_DAYS days for a "YYYY-MM-DD" in that range, else
 * null (too old, in the future or not a date).
 */
export function loggableDateKey(value?: string | null): Date | null {
  const today = todayDateKey();
  if (!value) return today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const key = dateKeyFromString(value);
  if (key.toISOString().slice(0, 10) !== value) return null;
  const daysBack = Math.round((today.getTime() - key.getTime()) / 86_400_000);
  return daysBack >= 0 && daysBack <= BACKFILL_DAYS ? key : null;
}

/** The last BACKFILL_DAYS days before today as "YYYY-MM-DD", newest first. */
export function backfillDays(): string[] {
  const today = todayDateKey().getTime();
  return Array.from({ length: BACKFILL_DAYS }, (_, i) => new Date(today - (i + 1) * 86_400_000).toISOString().slice(0, 10));
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
