import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { planRounds, type TodayPlan } from "@/lib/todayPlan";
import { sessionFor } from "@/lib/ptSession";

export { sessionFor };

// Personal training: a coach's package for one member (or a couple / small
// group), with a program of numbered sessions. See PtPackage in the schema.

const sessionInclude = {
  slots: { orderBy: { order: "asc" as const }, include: { movement: true } },
};

/** The member's PT package, if they're a PT client now. */
export async function getActivePtPackage(memberId: string) {
  const membership = await prisma.ptMember.findFirst({
    where: { memberId, leftAt: null, package: { endedAt: null } },
    include: {
      package: {
        include: {
          coach: { select: { id: true, name: true } },
          members: { where: { leftAt: null }, include: { member: { select: { id: true, name: true } } }, orderBy: { joinedAt: "asc" } },
          sessions: { orderBy: { number: "asc" }, include: sessionInclude },
        },
      },
    },
  });
  return membership?.package ?? null;
}

export type ActivePtPackage = NonNullable<Awaited<ReturnType<typeof getActivePtPackage>>>;

/** Today's PT session as a fill-in workout, like a class day. */
export async function getPtTodayPlan(pkg: ActivePtPackage, memberId: string, on?: Date): Promise<TodayPlan | null> {
  const session = sessionFor(pkg.sessions, on ?? todayDateKey());
  if (!session || session.slots.length === 0) return null;
  return {
    dayLabel: `PT · Sesi ${session.number}`,
    title: session.title?.trim() || `Sesi ${session.number}`,
    rounds: await planRounds(session.slots),
    klass: null,
    classOptions: [],
    borrowedFrom: null,
    pt: {
      sessionId: session.id,
      number: session.number,
      coachName: pkg.coach.name,
      partners: pkg.members.filter((m) => m.memberId !== memberId).map((m) => m.member.name),
    },
  };
}

/**
 * Marks a PT session as trained on `day`, the first time one of its members
 * logs a set for it. Only for a member of the package; later sets and other
 * days leave it as it is.
 */
export async function markPtSessionHeld(sessionId: string, memberId: string, day: Date) {
  await prisma.ptSession.updateMany({
    where: { id: sessionId, heldOn: null, package: { endedAt: null, members: { some: { memberId, leftAt: null } } } },
    data: { heldOn: day },
  });
}

/** Members who trained a PT session on `day`: their sets that day are PT, not class. */
export async function ptMemberIdsOn(day: Date): Promise<Set<string>> {
  const rows = await prisma.ptMember.findMany({
    where: { package: { sessions: { some: { heldOn: day } } } },
    select: { memberId: true },
  });
  return new Set(rows.map((r) => r.memberId));
}

/** Members who are PT clients now, for the "PT" badge. */
export async function activePtMemberIds(): Promise<Set<string>> {
  const rows = await prisma.ptMember.findMany({
    where: { leftAt: null, package: { endedAt: null } },
    select: { memberId: true },
  });
  return new Set(rows.map((r) => r.memberId));
}
