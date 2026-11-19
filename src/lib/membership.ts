import "server-only";
import { prisma } from "@/lib/prisma";
import type { FqFile } from "@/lib/fitquarter";

/** Users whose email matches one of `emails`, ignoring case (SQLite has no `mode: "insensitive"`). */
async function usersByEmail(emails: string[]): Promise<Map<string, string>> {
  const lowered = [...new Set(emails.map((e) => e.toLowerCase()).filter(Boolean))];
  if (lowered.length === 0) return new Map();
  const rows: { id: string; email: string }[] = [];
  // Chunks keep under SQLite's bound-parameter limit.
  for (let i = 0; i < lowered.length; i += 400) {
    const part = lowered.slice(i, i + 400);
    rows.push(
      ...(await prisma.$queryRawUnsafe<{ id: string; email: string }[]>(
        `SELECT "id", lower("email") AS "email" FROM "User" WHERE "role" = 'MEMBER' AND lower("email") IN (${part.map(() => "?").join(", ")})`,
        ...part
      ))
    );
  }
  return new Map(rows.map((r) => [r.email, r.id]));
}

export interface ImportPreview {
  members: number;
  membersNew: number;
  /** Members that already have an app account with the same email. */
  withAccount: number;
  memberships: number;
  membershipsNew: number;
  bookable: number;
  skipped: FqFile["skipped"];
}

/** What importing `file` would do, without writing. */
export async function previewImport(file: FqFile): Promise<ImportPreview> {
  const [knownMembers, knownMemberships, accounts] = await Promise.all([
    prisma.importedMember.findMany({ where: { externalId: { in: file.members.map((m) => m.externalId) } }, select: { externalId: true } }),
    prisma.membership.findMany({ where: { sourceRef: { in: file.memberships.map((m) => m.sourceRef) } }, select: { sourceRef: true } }),
    usersByEmail(file.members.map((m) => m.email)),
  ]);
  return {
    members: file.members.length,
    membersNew: file.members.length - knownMembers.length,
    withAccount: file.members.filter((m) => accounts.has(m.email)).length,
    memberships: file.memberships.length,
    membershipsNew: file.memberships.length - knownMemberships.length,
    bookable: file.memberships.filter((m) => m.canBook).length,
    skipped: file.skipped,
  };
}

/**
 * Writes the file: members by FitQuarter Member ID, memberships by
 * Transaction ID (a re-import updates them), each linked to the app account
 * with the same email when there is one. A linked member without a date of
 * birth gets FitQuarter's.
 */
export async function importFitQuarter(file: FqFile): Promise<ImportPreview> {
  const preview = await previewImport(file);
  const accounts = await usersByEmail(file.members.map((m) => m.email));
  // One app account links to one FitQuarter member. Members sharing an
  // email (a family on one address): the one already linked keeps it, else
  // the first in the file; the others are imported unlinked.
  const linkedTo = new Map(
    (await prisma.importedMember.findMany({ where: { userId: { not: null } }, select: { userId: true, externalId: true } })).map((r) => [r.userId!, r.externalId])
  );
  const idOf = new Map<string, { id: string; userId: string | null }>();
  for (const m of file.members) {
    const found = accounts.get(m.email);
    const holder = found ? linkedTo.get(found) : undefined;
    const userId = found && (holder === undefined || holder === m.externalId) ? found : null;
    if (userId) linkedTo.set(userId, m.externalId);
    const row = await prisma.importedMember.upsert({
      where: { externalId: m.externalId },
      create: { externalId: m.externalId, name: m.name, email: m.email, phone: m.phone, birthDate: m.birthDate, joinedAt: m.joinedAt, userId },
      update: { name: m.name, email: m.email, phone: m.phone, birthDate: m.birthDate ?? undefined, joinedAt: m.joinedAt, ...(userId ? { userId } : {}) },
      select: { id: true, userId: true },
    });
    idOf.set(m.externalId, row);
    if (row.userId && m.birthDate) await prisma.user.updateMany({ where: { id: row.userId, birthDate: null }, data: { birthDate: m.birthDate } });
  }
  for (const s of file.memberships) {
    const owner = idOf.get(s.externalId);
    if (!owner) continue;
    const data = {
      importedMemberId: owner.id,
      userId: owner.userId,
      packageName: s.packageName,
      kind: s.kind,
      canBook: s.canBook,
      credits: s.credits,
      creditsUsed: s.creditsUsed,
      startsAt: s.startsAt,
      expiresAt: s.expiresAt,
    };
    const existing = await prisma.membership.findUnique({ where: { sourceRef: s.sourceRef }, select: { creditsUsed: true } });
    // Credits booked in the app since the last import stay used: a newer
    // FitQuarter file never gives them back.
    if (existing) await prisma.membership.update({ where: { sourceRef: s.sourceRef }, data: { ...data, creditsUsed: Math.max(existing.creditsUsed, s.creditsUsed) } });
    else await prisma.membership.create({ data: { sourceRef: s.sourceRef, ...data } });
  }
  return preview;
}

/**
 * Links a member to their FitQuarter record (same email) on register or
 * login: their memberships become theirs, and FitQuarter's date of birth
 * fills an empty one. Quietly does nothing when there's no match.
 */
export async function claimImportedMember(user: { id: string; email: string; role: string; birthDate?: Date | null }) {
  if (user.role !== "MEMBER") return;
  try {
    const record = await prisma.importedMember.findFirst({ where: { email: user.email.toLowerCase(), userId: null } });
    if (!record) return;
    if (await prisma.importedMember.findUnique({ where: { userId: user.id }, select: { id: true } })) return;
    await prisma.importedMember.update({ where: { id: record.id }, data: { userId: user.id } });
    await prisma.membership.updateMany({ where: { importedMemberId: record.id }, data: { userId: user.id } });
    if (record.birthDate) await prisma.user.updateMany({ where: { id: user.id, birthDate: null }, data: { birthDate: record.birthDate } });
  } catch (error) {
    // Logging in must not fail because of this.
    console.error("claimImportedMember failed", error);
  }
}

/** A member's memberships that haven't ended (date key `today`), soonest end first. */
export function currentMemberships(userId: string, today: Date) {
  return prisma.membership.findMany({
    where: { userId, expiresAt: { gte: today } },
    orderBy: [{ expiresAt: "asc" }],
  });
}

/** The current memberships as plain data for the member screens. */
export async function membershipViews(userId: string, today: Date) {
  const rows = await currentMemberships(userId, today);
  return rows.map((m) => ({
    id: m.id,
    packageName: m.packageName,
    kind: m.kind,
    canBook: m.canBook,
    credits: m.credits,
    creditsUsed: m.creditsUsed,
    startsAt: m.startsAt.toISOString(),
    expiresAt: m.expiresAt.toISOString(),
  }));
}
