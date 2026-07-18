import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { PRType } from "@/generated/prisma/client";

// Recomputes isPR flags on every SetEntry for this member+exercise, plus the
// MAX_WEIGHT/MAX_1RM PersonalRecord rows, from scratch. Needed after an edit
// or delete since fixing one set can change which set actually holds the
// record (e.g. lowering today's PR set can hand the record back to an
// earlier one, or removing the record-holder can promote the next-best).
export async function recomputeExerciseRecords(
  tx: Prisma.TransactionClient,
  memberId: string,
  exerciseId: string
): Promise<void> {
  const sets = await tx.setEntry.findMany({
    where: { memberId, exerciseId },
    orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
  });

  let bestWeight = -Infinity;
  let bestWeightEntry: (typeof sets)[number] | null = null;
  let bestEst = -Infinity;
  let bestEstEntry: (typeof sets)[number] | null = null;

  for (const s of sets) {
    let isPR = false;
    if (s.weight > bestWeight) {
      bestWeight = s.weight;
      bestWeightEntry = s;
      isPR = true;
    }
    if (s.estimated1RM > bestEst) {
      bestEst = s.estimated1RM;
      bestEstEntry = s;
      isPR = true;
    }
    if (s.isPR !== isPR) {
      await tx.setEntry.update({ where: { id: s.id }, data: { isPR } });
    }
  }

  if (bestWeightEntry) {
    await tx.personalRecord.upsert({
      where: { memberId_exerciseId_type: { memberId, exerciseId, type: PRType.MAX_WEIGHT } },
      create: {
        memberId,
        exerciseId,
        type: PRType.MAX_WEIGHT,
        weight: bestWeightEntry.weight,
        reps: bestWeightEntry.reps,
        estimated1RM: bestWeightEntry.estimated1RM,
        setEntryId: bestWeightEntry.id,
        achievedAt: bestWeightEntry.workoutDate,
      },
      update: {
        weight: bestWeightEntry.weight,
        reps: bestWeightEntry.reps,
        estimated1RM: bestWeightEntry.estimated1RM,
        setEntryId: bestWeightEntry.id,
        achievedAt: bestWeightEntry.workoutDate,
      },
    });
  } else {
    await tx.personalRecord.deleteMany({ where: { memberId, exerciseId, type: PRType.MAX_WEIGHT } });
  }

  if (bestEstEntry) {
    await tx.personalRecord.upsert({
      where: { memberId_exerciseId_type: { memberId, exerciseId, type: PRType.MAX_1RM } },
      create: {
        memberId,
        exerciseId,
        type: PRType.MAX_1RM,
        weight: bestEstEntry.weight,
        reps: bestEstEntry.reps,
        estimated1RM: bestEstEntry.estimated1RM,
        setEntryId: bestEstEntry.id,
        achievedAt: bestEstEntry.workoutDate,
      },
      update: {
        weight: bestEstEntry.weight,
        reps: bestEstEntry.reps,
        estimated1RM: bestEstEntry.estimated1RM,
        setEntryId: bestEstEntry.id,
        achievedAt: bestEstEntry.workoutDate,
      },
    });
  } else {
    await tx.personalRecord.deleteMany({ where: { memberId, exerciseId, type: PRType.MAX_1RM } });
  }
}
