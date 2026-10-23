import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { PRType } from "@/generated/prisma/client";
import { recordTypesFor, recordValue } from "@/lib/pr";

// Recomputes isPR flags on every SetEntry for this member+exercise, plus the
// PersonalRecord rows, from scratch. Needed after an edit or delete since
// fixing one set can change which set actually holds the record (e.g.
// lowering today's PR set can hand the record back to an earlier one, or
// removing the record-holder can promote the next-best).
export async function recomputeExerciseRecords(
  tx: Prisma.TransactionClient,
  memberId: string,
  exerciseId: string
): Promise<void> {
  const sets = await tx.setEntry.findMany({
    where: { memberId, exerciseId },
    orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
  });

  const best = new Map<PRType, (typeof sets)[number]>();
  for (const s of sets) {
    let isPR = false;
    for (const type of recordTypesFor(s.weight, s.unit)) {
      const holder = best.get(type);
      if (!holder || recordValue(type, s) > recordValue(type, holder)) {
        best.set(type, s);
        isPR = true;
      }
    }
    if (s.isPR !== isPR) {
      await tx.setEntry.update({ where: { id: s.id }, data: { isPR } });
    }
  }

  for (const type of [PRType.MAX_WEIGHT, PRType.MAX_1RM, PRType.MAX_AMOUNT]) {
    const s = best.get(type);
    if (!s) {
      await tx.personalRecord.deleteMany({ where: { memberId, exerciseId, type } });
      continue;
    }
    const data = { weight: s.weight, reps: s.reps, unit: s.unit, estimated1RM: s.estimated1RM, setEntryId: s.id, achievedAt: s.workoutDate };
    await tx.personalRecord.upsert({
      where: { memberId_exerciseId_type: { memberId, exerciseId, type } },
      create: { memberId, exerciseId, type, ...data },
      update: data,
    });
  }
}
