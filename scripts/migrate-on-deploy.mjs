// Applies pending prisma/migrations/*/migration.sql to the production Turso
// database during a Vercel production build (the job `prisma db push` did on
// Postgres; the Prisma CLI can't reach Turso). Applied migrations are recorded
// in "_app_migrations", so each runs once.
//
// New schema change: edit prisma/schema.prisma, then
//   npx prisma migrate dev --name <what-changed>
// which writes the next migration folder against the local file:./dev.db.
//
// Only runs when VERCEL_ENV=production; preview and local builds skip it so
// an unmerged branch never changes the real database. Each migration runs in
// one transaction, so a failing one leaves the schema as it was and fails the
// build (Vercel keeps serving the previous deployment).
import { readdirSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const DIR = "prisma/migrations";

if (process.env.VERCEL_ENV !== "production") {
  console.log(`[migrate-on-deploy] skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})`);
  process.exit(0);
}
if (!process.env.TURSO_DATABASE_URL) {
  console.error("[migrate-on-deploy] FAIL: TURSO_DATABASE_URL is not set for this build");
  process.exit(1);
}

const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

try {
  await client.execute(`CREATE TABLE IF NOT EXISTS "_app_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TEXT NOT NULL)`);
  const applied = new Set((await client.execute(`SELECT "name" FROM "_app_migrations"`)).rows.map((r) => r.name));
  const pending = readdirSync(DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !applied.has(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  for (const name of pending) {
    const sql = readFileSync(`${DIR}/${name}/migration.sql`, "utf8");
    const statements = sql
      .split(/;\s*$/m)
      .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
      .filter(Boolean);
    await client.batch(
      [
        "PRAGMA defer_foreign_keys = ON",
        ...statements,
        { sql: `INSERT INTO "_app_migrations" ("name", "appliedAt") VALUES (?, ?)`, args: [name, new Date().toISOString()] },
      ],
      "write"
    );
    console.log(`[migrate-on-deploy] applied ${name}`);
  }
  console.log(`[migrate-on-deploy] ok (${pending.length} applied, ${applied.size} already there)`);
} catch (error) {
  console.error("[migrate-on-deploy] FAIL:", error.message);
  process.exit(1);
} finally {
  client.close();
}
