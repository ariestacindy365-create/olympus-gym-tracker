import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { resolveTodayClass, type TodayClasses } from "@/lib/classSchedule";
import { CLASS_COOKIE } from "@/lib/classCookie";

/** Today's class for a member: their "Ganti kelas" pick, else worked out from the timetable. */
export async function getMemberTodayClass(memberId: string): Promise<TodayClasses> {
  const [cookieStore, firstSet] = await Promise.all([
    cookies(),
    prisma.setEntry.findFirst({
      where: { memberId, workoutDate: todayDateKey() },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  return resolveTodayClass({ picked: cookieStore.get(CLASS_COOKIE)?.value, firstSetAt: firstSet?.createdAt });
}
