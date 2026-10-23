import "server-only";
import { PRType, SetUnit, type Prisma } from "@/generated/prisma/client";

interface CheckPRParams {
  memberId: string;
  exerciseId: string;
  weight: number;
  reps: number;
  unit?: SetUnit;
  estimated1RM: number;
  setEntryId: string;
}

/**
 * Which records a set can hold:
 * - rep sets with load: heaviest weight and best estimated 1RM;
 * - timed / lap / distance / calorie sets with load: heaviest weight;
 * - those without load: the longest / most (MAX_AMOUNT);
 * - rep sets without load (0 kg): none.
 */
export function recordTypesFor(weight: number, unit: SetUnit = SetUnit.REPS): PRType[] {
  if (unit === SetUnit.REPS) return weight > 0 ? [PRType.MAX_WEIGHT, PRType.MAX_1RM] : [];
  return weight > 0 ? [PRType.MAX_WEIGHT] : [PRType.MAX_AMOUNT];
}

/** The number a record of this type compares. */
export function recordValue(type: PRType, s: { weight: number; reps: number; estimated1RM: number }) {
  return type === PRType.MAX_WEIGHT ? s.weight : type === PRType.MAX_1RM ? s.estimated1RM : s.reps;
}

// Must be called with a transaction client so the SetEntry upsert and any
// PersonalRecord upserts commit (or fail) together.
export async function checkAndRecordPR(
  tx: Prisma.TransactionClient,
  { memberId, exerciseId, weight, reps, unit = SetUnit.REPS, estimated1RM, setEntryId }: CheckPRParams
): Promise<boolean> {
  let isPR = false;
  const set = { weight, reps, estimated1RM };
  for (const type of recordTypesFor(weight, unit)) {
    const where = { memberId_exerciseId_type: { memberId, exerciseId, type } };
    const current = await tx.personalRecord.findUnique({ where });
    if (!current || recordValue(type, set) > recordValue(type, current)) {
      await tx.personalRecord.upsert({
        where,
        create: { memberId, exerciseId, type, weight, reps, unit, estimated1RM, setEntryId },
        update: { weight, reps, unit, estimated1RM, setEntryId, achievedAt: new Date() },
      });
      isPR = true;
    }
  }
  return isPR;
}
