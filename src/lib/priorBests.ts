import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const PRIOR_BESTS_TAG = "board-prior-bests";

// Best estimated 1RM per member+exercise from *before* today. The Live Board
// polls every few seconds, but these rows only change when an older set is
// edited, deleted or imported — so cache them (keyed by date + exercises) and
// drop the cache from those write paths via invalidatePriorBests().
const getCachedPriorBests = unstable_cache(
  async (beforeIso: string, exerciseIds: string[]) => {
    const groups = await prisma.setEntry.groupBy({
      by: ["memberId", "exerciseId"],
      where: { workoutDate: { lt: new Date(beforeIso) }, exerciseId: { in: exerciseIds } },
      _max: { estimated1RM: true },
    });
    const entries: [string, number][] = [];
    for (const g of groups) {
      if (g._max.estimated1RM != null) entries.push([`${g.memberId}:${g.exerciseId}`, g._max.estimated1RM]);
    }
    return entries;
  },
  ["board-prior-bests"],
  { tags: [PRIOR_BESTS_TAG], revalidate: 24 * 60 * 60 }
);

/** Map of "memberId:exerciseId" -> best estimated 1RM before `before`. */
export async function getPriorBests(before: Date, exerciseIds: string[]): Promise<Map<string, number>> {
  if (exerciseIds.length === 0) return new Map();
  const sortedIds = [...exerciseIds].sort();
  return new Map(await getCachedPriorBests(before.toISOString(), sortedIds));
}

/** Call after any write that can change a set dated before today. */
export function invalidatePriorBests() {
  revalidateTag(PRIOR_BESTS_TAG, { expire: 0 });
}
