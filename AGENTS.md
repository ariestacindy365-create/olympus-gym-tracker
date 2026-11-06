# Before every PR

Run `npm test`. It starts with the feature guard (`tests/feature-guard.mjs`),
which fails when a live page, API route or feature is missing — usually a
sign the change was made from an older copy of the code. Restore what went
missing rather than editing the guard. When a feature ships, add its line to
`FEATURES` there; a new page or API route goes into `tests/feature-routes.json`.
CI (`.github/workflows/ci.yml`) runs the same checks on every PR.

<!-- BEGIN:nextjs-agent-rules -->

# Database: Turso (SQLite), not Postgres

Prisma runs on SQLite through `@prisma/adapter-libsql` (`src/lib/prisma.ts`,
env `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`; without them it uses the local
`file:./dev.db`). Postgres-only features don't exist here: use
`idsByNameIgnoringCase` instead of `mode: "insensitive"`,
`createEachSkippingDuplicates` instead of `skipDuplicates` (`src/lib/sqlite.ts`),
and `lockForWrite` instead of advisory locks (`src/lib/writeLock.ts`).

Schema change: edit `prisma/schema.prisma`, run
`npx prisma migrate dev --name <change>` and commit the new folder in
`prisma/migrations`. `scripts/migrate-on-deploy.mjs` applies it to production
during the Vercel production build. Never `prisma db push` — the Prisma CLI
can't reach Turso.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
