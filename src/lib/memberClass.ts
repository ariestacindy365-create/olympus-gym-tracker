import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { resolveTodayClass, type TodayClasses } from "@/lib/classSchedule";
import { CLASS_COOKIE } from "@/lib/classCookie";

/** Today's class for a member: their "Ganti kelas" pick, else the class they booked, else worked out from the timetable. */
export async function getMemberTodayClass(memberId: string): Promise<TodayClasses> {
  const [cookieStore, firstSet, booking] = await Promise.all([
    cookies(),
    prisma.setEntry.findFirst({
      where: { memberId, workoutDate: todayDateKey() },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    // A class booked for today sets the program, unless they picked another.
    prisma.classBooking.findFirst({
      where: { userId: memberId, classDate: todayDateKey(), status: { in: ["ATTENDED", "BOOKED"] } },
      orderBy: [{ status: "asc" }, { sessionId: "asc" }],
      select: { sessionId: true },
    }),
  ]);
  const today = todayDateKey().toISOString().slice(0, 10);
  // A pick from another day doesn't count; then the booking does.
  const pick = cookieStore.get(CLASS_COOKIE)?.value;
  const picked = pick?.startsWith(`${today}|`) ? pick : booking ? `${today}|${booking.sessionId}` : null;
  return resolveTodayClass({ picked, firstSetAt: firstSet?.createdAt });
}

/**
 * The class for a past day a member is filling in: the one they picked (from
 * the URL), else the class saved with that day's workout, else the time of
 * the class they last trained in.
 */
export async function getMemberClassOn(memberId: string, day: Date, pickedSessionId?: string | null): Promise<TodayClasses> {
  const [that, last] = await Promise.all([
    prisma.workout.findUnique({ where: { memberId_workoutDate: { memberId, workoutDate: day } }, select: { classLabel: true } }),
    prisma.workout.findFirst({
      where: { memberId, classLabel: { not: null } },
      orderBy: { workoutDate: "desc" },
      select: { classLabel: true },
    }),
  ]);
  const usualTime = (that?.classLabel ?? last?.classLabel)?.split(" · ").pop() ?? null;
  const dayStr = day.toISOString().slice(0, 10);
  return resolveTodayClass({ pastDay: day, picked: pickedSessionId ? `${dayStr}|${pickedSessionId}` : null, usualTime });
}
