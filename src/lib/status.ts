import "server-only";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";

const ONLINE_WINDOW_MS = 60 * 1000;

export function isOnline(lastActiveAt: Date): boolean {
  return Date.now() - lastActiveAt.getTime() < ONLINE_WINDOW_MS;
}

// True once a member has made a request during a class session today —
// stays true for the rest of the day regardless of later activity, unlike
// isOnline()'s rolling 60s window. Used by the Live Board so a member
// doesn't drop off the list just because they put their phone away mid-set.
export function isPresentToday(presentDate: Date | null): boolean {
  if (!presentDate) return false;
  return presentDate.getTime() === todayDateKey().getTime();
}

export async function hasLoggedToday(memberId: string): Promise<boolean> {
  const setEntry = await prisma.setEntry.findFirst({
    where: { memberId, workoutDate: todayDateKey() },
    select: { id: true },
  });
  return !!setEntry;
}
