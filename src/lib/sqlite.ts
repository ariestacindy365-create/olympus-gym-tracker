// Stand-ins for the Postgres features the app used before moving to Turso
// (SQLite): case-insensitive name lookups and createMany's skipDuplicates.
import { prisma } from "@/lib/prisma";

/**
 * Ids of the Movement / Exercise rows whose name matches one of `names`,
 * ignoring case — what `name: { in, mode: "insensitive" }` did on Postgres.
 * Prisma's SQLite filters have no `mode`, so this matches on lower(name).
 */
export async function idsByNameIgnoringCase(table: "Movement" | "Exercise", names: string[]): Promise<string[]> {
  const lowered = [...new Set(names.map((n) => n.toLowerCase()))];
  if (lowered.length === 0) return [];
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "${table}" WHERE lower("name") IN (${lowered.map(() => "?").join(", ")})`,
    ...lowered
  );
  return rows.map((r) => r.id);
}

/**
 * createMany with skipDuplicates, which SQLite doesn't support: creates the
 * rows one by one and skips any that a unique key already holds (including
 * one a parallel request inserted a moment earlier).
 */
export async function createEachSkippingDuplicates<T>(rows: T[], create: (row: T) => Promise<unknown>) {
  for (const row of rows) {
    try {
      await create(row);
    } catch (error) {
      // P2002: unique constraint failed.
      if ((error as { code?: unknown })?.code !== "P2002") throw error;
    }
  }
}
