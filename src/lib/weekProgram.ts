import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { effectiveWeek, getOrCreateRotation } from "@/lib/programHistory";
import { matchesWeekday, mondayOf, weekdayLabelForDate } from "@/lib/programRotation";
import { buildSlideRounds, type ProgramSlideData } from "@/lib/programSlide";

export interface WeekProgramDay extends ProgramSlideData {
  isToday: boolean;
}

/**
 * This week's class program (rotation Minggu, or a coach's one-off
 * override), one slide per day. "Today" uses the gym's Jakarta date, not
 * the server clock.
 */
/** This week's program (rotation or one-off override) with full slot + movement data. */
export async function getThisWeekProgramRaw() {
  const key = todayDateKey();
  const today = new Date(key.getUTCFullYear(), key.getUTCMonth(), key.getUTCDate());
  const [rotation, override] = await Promise.all([
    getOrCreateRotation(),
    prisma.programWeekOverride.findUnique({ where: { weekStart: mondayOf(today) } }),
  ]);
  const overrides = new Map(override ? [[override.weekStart.getTime(), override.weekNumber]] : []);
  const { weekNumber } = effectiveWeek(today, rotation, overrides);

  const program = await prisma.trainingProgram.findUnique({
    where: { weekNumber },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: {
          slots: {
            orderBy: { order: "asc" },
            include: { movement: { select: { name: true, primaryMuscle: true, secondaryMuscle: true } } },
          },
        },
      },
    },
  });
  return { weekNumber, today, program };
}

export async function getThisWeekProgram(): Promise<{ weekNumber: number; days: WeekProgramDay[] }> {
  const { weekNumber, today, program } = await getThisWeekProgramRaw();
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
  return { weekNumber, days: days.filter((d) => d.rounds.length > 0) };
}
