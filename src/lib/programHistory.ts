import { prisma } from "@/lib/prisma";
import { DEFAULT_PROGRAM_WEEKS, matchesWeekday, mondayOf, weekNumberForDate, weekdayLabelForDate } from "@/lib/programRotation";

export async function getOrCreateRotation() {
  const existing = await prisma.programRotation.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  // Two first requests at once (the dashboard asks twice in parallel): the
  // second insert is skipped and both read the row that won.
  await prisma.programRotation.createMany({
    data: [{ id: "singleton", anchorMonday: mondayOf(new Date()), anchorWeekNumber: 1 }],
    skipDuplicates: true,
  });
  return prisma.programRotation.findUniqueOrThrow({ where: { id: "singleton" } });
}

/** A coach's rotation: how many Minggu, and which one an anchor Monday ran. */
export interface ProgramCycle {
  weeks: number;
  anchorMonday: Date;
  anchorWeekNumber: number;
  /** Rotations it replaced, oldest first; each ran until the Monday `until`. */
  earlier?: (Omit<ProgramCycle, "earlier"> & { until: Date })[];
}

/** A stored `history` entry, as written by the weeks route. */
export interface StoredCycle {
  weeks: number;
  anchorMonday: string;
  anchorWeekNumber: number;
  until: string;
}

function parseHistory(raw: unknown): NonNullable<ProgramCycle["earlier"]> {
  if (!Array.isArray(raw)) return [];
  return (raw as StoredCycle[])
    .filter((h) => h && Number.isInteger(h.weeks) && typeof h.anchorMonday === "string" && typeof h.until === "string")
    .map((h) => ({ weeks: h.weeks, anchorMonday: new Date(h.anchorMonday), anchorWeekNumber: h.anchorWeekNumber, until: new Date(h.until) }))
    .sort((a, b) => a.until.getTime() - b.until.getTime());
}

/** The rotation that was in force in the week of `date`. */
export function cycleOn(cycle: ProgramCycle, date: Date): Omit<ProgramCycle, "earlier"> {
  const monday = mondayOf(date).getTime();
  return cycle.earlier?.find((c) => monday < c.until.getTime()) ?? cycle;
}

/** Each coach's rotation; a coach who never changed theirs runs 4 weeks on the shared one. */
export async function getProgramCycles(): Promise<(coachId: string | null) => ProgramCycle> {
  const [rotation, rows] = await Promise.all([getOrCreateRotation(), prisma.coachProgramCycle.findMany()]);
  const byCoach = new Map(rows.map((r) => [r.coachId, r]));
  const shared = { weeks: DEFAULT_PROGRAM_WEEKS, anchorMonday: rotation.anchorMonday, anchorWeekNumber: rotation.anchorWeekNumber };
  return (coachId) => {
    const row = coachId ? byCoach.get(coachId) : undefined;
    return row
      ? { weeks: row.weeks, anchorMonday: row.anchorMonday, anchorWeekNumber: row.anchorWeekNumber, earlier: parseHistory(row.history) }
      : shared;
  };
}

export async function getProgramCycle(coachId: string | null): Promise<ProgramCycle> {
  return (await getProgramCycles())(coachId);
}

/**
 * One-off "this week runs Minggu N" per coach, for weeks starting in
 * [from, to]: coachId → (Monday time → Minggu). A row in the old shared
 * table counts for the coach who set it.
 */
export async function getWeekOverrides(from: Date, to: Date): Promise<(coachId: string | null) => Map<number, number>> {
  const range = { weekStart: { gte: mondayOf(from), lte: to } };
  const [own, legacy] = await Promise.all([
    prisma.coachWeekOverride.findMany({ where: range }),
    prisma.programWeekOverride.findMany({ where: range }),
  ]);
  const byCoach = new Map<string, Map<number, number>>();
  for (const o of [...legacy, ...own]) {
    const m = byCoach.get(o.coachId) ?? new Map<number, number>();
    m.set(o.weekStart.getTime(), o.weekNumber);
    byCoach.set(o.coachId, m);
  }
  const none = new Map<number, number>();
  return (coachId) => (coachId && byCoach.get(coachId)) || none;
}

// The Minggu that applies to the week containing `date`: the coach's one-off
// override for that week if they set one, else their rotation.
export function effectiveWeek(date: Date, full: ProgramCycle, overrides: Map<number, number>) {
  const cycle = cycleOn(full, date);
  const rotationWeekNumber = weekNumberForDate(date, cycle.anchorMonday, cycle.anchorWeekNumber, cycle.weeks);
  const set = overrides.get(mondayOf(date).getTime());
  // A week the coach has since removed no longer applies.
  const override = set !== undefined && set <= cycle.weeks ? set : undefined;
  return { weekNumber: override ?? rotationWeekNumber, rotationWeekNumber, overridden: override !== undefined };
}

// For every date in `year`/`month` (0-11), works out which Minggu
// applies (rotation anchor, or a one-off override for that week), and — if
// that week has a day matching the date's weekday — the program for that day.
// Also reports the current week so the calendar can offer "use this program
// for this week".
export async function computeMonthProgramDays(year: number, month: number, coachId: string) {
  const today = new Date();
  const rangeStart = mondayOf(new Date(Math.min(new Date(year, month, 1).getTime(), today.getTime())));
  const rangeEnd = new Date(Math.max(new Date(year, month + 1, 1).getTime(), today.getTime()));
  const [rotation, programs, overridesFor] = await Promise.all([
    getProgramCycle(coachId),
    prisma.trainingProgram.findMany({
      where: { coachId },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: { slots: { orderBy: { order: "asc" }, include: { movement: true } } },
        },
      },
    }),
    getWeekOverrides(rangeStart, rangeEnd),
  ]);
  const overrides = overridesFor(coachId);

  const programByWeek = new Map(programs.map((p) => [p.weekNumber, p]));
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const { weekNumber, overridden } = effectiveWeek(date, rotation, overrides);
    const weekdayLabel = weekdayLabelForDate(date);
    const program = programByWeek.get(weekNumber);
    const matchedDay = program?.days.find((day) => matchesWeekday(day.dayLabel, weekdayLabel)) ?? null;

    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      weekNumber,
      overridden,
      day: matchedDay
        ? {
            dayLabel: matchedDay.dayLabel,
            focusLabel: matchedDay.focusLabel,
            slots: matchedDay.slots.map((s) => ({
              slotLabel: s.slotLabel,
              movementName: s.movement.name,
              sets: s.sets,
              repTarget: s.repTarget,
              targetWeight: s.targetWeight,
              note: s.note,
              roundScheme: s.roundScheme,
            })),
          }
        : null,
    });
  }

  const thisWeekStart = mondayOf(today);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
  const currentWeek = {
    weekStart: dateKey(thisWeekStart),
    weekEnd: dateKey(thisWeekEnd),
    ...effectiveWeek(today, rotation, overrides),
  };

  return { rotation, days, currentWeek };
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
