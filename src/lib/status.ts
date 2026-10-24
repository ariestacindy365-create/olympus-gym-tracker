import "server-only";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";

const ONLINE_WINDOW_MS = 60 * 1000;

export function isOnline(lastActiveAt: Date): boolean {
  return Date.now() - lastActiveAt.getTime() < ONLINE_WINDOW_MS;
}

export async function hasLoggedToday(memberId: string): Promise<boolean> {
  const setEntry = await prisma.setEntry.findFirst({
    where: { memberId, workoutDate: todayDateKey() },
    select: { id: true },
  });
  return !!setEntry;
}
