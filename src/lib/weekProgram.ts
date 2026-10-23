import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { effectiveWeek, getOrCreateRotation } from "@/lib/programHistory";
import { matchesWeekday, mondayOf, weekdayLabelForDate } from "@/lib/programRotation";
import { buildSlideRounds, type ProgramSlideData } from "@/lib/programSlide";
import { getClassSchedule } from "@/lib/classSchedule";
import { CLASS_SESSIONS } from "@/lib/classSessions";

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
export async function getThisWeekProgramRaw(coachId: string | null, needWeekday?: string, on?: Date) {
  // `on`: a past day key (filling in a forgotten workout) — that day's week of the rotation.
  const key = on ?? todayDateKey();
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
        note: s.note,
      }))
    ),
  }));
  return { weekNumber, coachName: program?.coach.name ?? null, days: days.filter((d) => d.rounds.length > 0) };
}

/**
 * Coaches with a program this week (rotation Minggu or override), and the
 * times they teach today, for the member's "program coach lain" tabs.
 */
export async function getThisWeekCoaches(weekNumber: number): Promise<{ id: string; name: string; times: string[] }[]> {
  const [programs, schedule] = await Promise.all([
    prisma.trainingProgram.findMany({
      where: { weekNumber, days: { some: { slots: { some: {} } } } },
      select: { coach: { select: { id: true, name: true } } },
      orderBy: { coach: { name: "asc" } },
    }),
    getClassSchedule(),
  ]);
  const weekday = todayDateKey().getUTCDay();
  const seen = new Set<string>();
  return programs.flatMap(({ coach }) => {
    if (seen.has(coach.id)) return [];
    seen.add(coach.id);
    const times = CLASS_SESSIONS.filter((cs) =>
      schedule.some((e) => e.weekday === weekday && e.sessionId === cs.id && e.coach?.id === coach.id)
    ).map((cs) => cs.name.slice(0, 5));
    return [{ id: coach.id, name: coach.name, times }];
  });
}
