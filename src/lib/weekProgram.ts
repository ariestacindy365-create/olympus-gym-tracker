import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { effectiveWeek, getOrCreateRotation } from "@/lib/programHistory";
import { matchesWeekday, mondayOf, weekdayLabelForDate } from "@/lib/programRotation";
import { buildSlideRounds, type ProgramSlideData } from "@/lib/programSlide";

export interface WeekProgramDay extends ProgramSlideData {
  isToday: boolean;
}

const programInclude = {
  coach: { select: { name: true } },
  days: {
    orderBy: { order: "asc" as const },
    include: {
      slots: {
        orderBy: { order: "asc" as const },
        include: { movement: { select: { name: true, primaryMuscle: true, secondaryMuscle: true } } },
      },
    },
  },
};

/**
 * This week's program (rotation Minggu, or a one-off override) of one
 * coach, with full slot + movement data. When that coach hasn't written
 * this week (or, with `needWeekday`, that day) yet, another coach's program
 * for the week is used instead (program.coach says whose it is). "Today"
 * uses the gym's Jakarta date.
 */
export async function getThisWeekProgramRaw(coachId: string | null, needWeekday?: string) {
  const key = todayDateKey();
  const today = new Date(key.getUTCFullYear(), key.getUTCMonth(), key.getUTCDate());
  const [rotation, override] = await Promise.all([
    getOrCreateRotation(),
    prisma.programWeekOverride.findUnique({ where: { weekStart: mondayOf(today) } }),
  ]);
  const overrides = new Map(override ? [[override.weekStart.getTime(), override.weekNumber]] : []);
  const { weekNumber } = effectiveWeek(today, rotation, overrides);

  const all = await prisma.trainingProgram.findMany({
    where: { weekNumber },
    orderBy: { updatedAt: "desc" },
    include: programInclude,
  });
  const usable = (p: (typeof all)[number]) =>
    p.days.some((d) => d.slots.length > 0 && (!needWeekday || matchesWeekday(d.dayLabel, needWeekday)));
  const own = all.find((p) => p.coachId === coachId) ?? null;
  const program = own && usable(own) ? own : (all.find(usable) ?? own);
  return { weekNumber, today, program };
}

/** This week's program for one coach, one slide per day. */
export async function getThisWeekProgram(
  coachId: string | null
): Promise<{ weekNumber: number; coachName: string | null; days: WeekProgramDay[] }> {
  const { weekNumber, today, program } = await getThisWeekProgramRaw(coachId);
  const weekday = weekdayLabelForDate(today);
  const days = (program?.days ?? []).map((d) => ({
    dayLabel: d.dayLabel,
    title: d.focusLabel?.trim() || d.dayLabel,
    isToday: matchesWeekday(d.dayLabel, weekday),
    rounds: buildSlideRounds(
      d.slots.map((s) => ({
        slotLabel: s.slotLabel,
        movementName: s.movement.name,
        sets: s.sets,
        repTarget: s.repTarget,
        roundScheme: s.roundScheme,
      }))
    ),
  }));
  return { weekNumber, coachName: program?.coach.name ?? null, days: days.filter((d) => d.rounds.length > 0) };
}
