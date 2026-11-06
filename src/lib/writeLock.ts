import type { Prisma } from "@/generated/prisma/client";

/**
 * Serialise this transaction with every other writer, the job
 * pg_advisory_xact_lock did on Postgres. SQLite (Turso) has one
 * database-wide write lock; a no-op write as the transaction's first
 * statement takes it up front, so the reads that follow can't go stale
 * before the transaction writes.
 */
export async function lockForWrite(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`UPDATE "ProgramRotation" SET "id" = "id" WHERE 0`;
}
