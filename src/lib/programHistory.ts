import { prisma } from "@/lib/prisma";
import { matchesWeekday, mondayOf, weekNumberForDate, weekdayLabelForDate } from "@/lib/programRotation";

export async function getOrCreateRotation() {
  const existing = await prisma.programRotation.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.programRotation.create({
    data: { id: "singleton", anchorMonday: mondayOf(new Date()), anchorWeekNumber: 1 },
  });
}

// The Minggu that applies to the week containing `date`: a one-off
// ProgramWeekOverride for that week if a coach set one, else the rotation.
export function effectiveWeek(
  date: Date,
  rotation: { anchorMonday: Date; anchorWeekNumber: number },
  overrides: Map<number, number>
) {
  const rotationWeekNumber = weekNumberForDate(date, rotation.anchorMonday, rotation.anchorWeekNumber);
  const override = overrides.get(mondayOf(date).getTime());
  return { weekNumber: override ?? rotationWeekNumber, rotationWeekNumber, overridden: override !== undefined };
}

// For every date in `year`/`month` (0-11), works out which Minggu (1-4)
// applies (rotation anchor, or a one-off override for that week), and — if
// that week has a day matching the date's weekday — the program for that day.
// Also reports the current week so the calendar can offer "use this program
// for this week".
export async function computeMonthProgramDays(year: number, month: number) {
  const today = new Date();
  const rangeStart = mondayOf(new Date(Math.min(new Date(year, month, 1).getTime(), today.getTime())));
  const rangeEnd = new Date(Math.max(new Date(year, month + 1, 1).getTime(), today.getTime()));
  const [rotation, programs, overrideRows] = await Promise.all([
    getOrCreateRotation(),
    prisma.trainingProgram.findMany({
      include: {
        days: {
          orderBy: { order: "asc" },
          include: { slots: { orderBy: { order: "asc" }, include: { movement: true } } },
        },
      },
    }),
    prisma.programWeekOverride.findMany({ where: { weekStart: { gte: rangeStart, lte: rangeEnd } } }),
  ]);
  const overrides = new Map(overrideRows.map((o) => [o.weekStart.getTime(), o.weekNumber]));

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
