import "server-only";
import { prisma } from "@/lib/prisma";
import { idsByNameIgnoringCase } from "@/lib/sqlite";
import { perSideFromTarget } from "@/lib/setUnits";

/**
 * Whether a set logged without saying so is per side ("10 reps each"), so
 * the same exercise counts the same volume however it was logged: what the
 * coaches' programs say for that movement, else the member's other sets of
 * it that day, else their last set of it.
 */
export async function resolvePerSide(opts: { memberId: string; exerciseId: string; exerciseName: string; workoutDate: Date }): Promise<boolean> {
  const movementIds = await idsByNameIgnoringCase("Movement", [opts.exerciseName]);
  if (movementIds.length > 0) {
    const [programSlots, ptSlots] = await Promise.all([
      prisma.programSlot.findMany({ where: { movementId: { in: movementIds } }, select: { repTarget: true } }),
      prisma.ptSlot.findMany({ where: { movementId: { in: movementIds } }, select: { repTarget: true } }),
    ]);
    const slots = [...programSlots, ...ptSlots];
    if (slots.length > 0) return slots.filter((s) => perSideFromTarget(s.repTarget)).length * 2 > slots.length;
  }
  const other = await prisma.setEntry.findFirst({
    where: { memberId: opts.memberId, exerciseId: opts.exerciseId, workoutDate: { lte: opts.workoutDate } },
    orderBy: [{ workoutDate: "desc" }, { setNumber: "desc" }],
    select: { perSide: true },
  });
  return other?.perSide ?? false;
}
