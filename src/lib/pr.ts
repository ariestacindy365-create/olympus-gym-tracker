import "server-only";
import { PRType, type Prisma } from "@/generated/prisma/client";

interface CheckPRParams {
  memberId: string;
  exerciseId: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  setEntryId: string;
}

// Must be called with a transaction client so the SetEntry upsert and any
// PersonalRecord upserts commit (or fail) together.
export async function checkAndRecordPR(
  tx: Prisma.TransactionClient,
  { memberId, exerciseId, weight, reps, estimated1RM, setEntryId }: CheckPRParams
): Promise<boolean> {
  let isPR = false;

  const currentMaxWeight = await tx.personalRecord.findUnique({
    where: { memberId_exerciseId_type: { memberId, exerciseId, type: PRType.MAX_WEIGHT } },
  });
  if (!currentMaxWeight || weight > currentMaxWeight.weight) {
    await tx.personalRecord.upsert({
      where: { memberId_exerciseId_type: { memberId, exerciseId, type: PRType.MAX_WEIGHT } },
      create: { memberId, exerciseId, type: PRType.MAX_WEIGHT, weight, reps, estimated1RM, setEntryId },
      update: { weight, reps, estimated1RM, setEntryId, achievedAt: new Date() },
    });
    isPR = true;
  }

  const currentMax1RM = await tx.personalRecord.findUnique({
    where: { memberId_exerciseId_type: { memberId, exerciseId, type: PRType.MAX_1RM } },
  });
  if (!currentMax1RM || estimated1RM > currentMax1RM.estimated1RM) {
    await tx.personalRecord.upsert({
      where: { memberId_exerciseId_type: { memberId, exerciseId, type: PRType.MAX_1RM } },
      create: { memberId, exerciseId, type: PRType.MAX_1RM, weight, reps, estimated1RM, setEntryId },
      update: { weight, reps, estimated1RM, setEntryId, achievedAt: new Date() },
    });
    isPR = true;
  }

  return isPR;
}
