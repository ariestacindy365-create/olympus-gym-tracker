import { prisma } from "@/lib/prisma";
import { matchesWeekday, mondayOf, weekNumberForDate, weekdayLabelForDate } from "@/lib/programRotation";

export async function getOrCreateRotation() {
  const existing = await prisma.programRotation.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.programRotation.create({
    data: { id: "singleton", anchorMonday: mondayOf(new Date()), anchorWeekNumber: 1 },
  });
}

// For every date in `year`/`month` (0-11), works out which Minggu (1-4)
// applies via the rotation anchor, and — if that week has a day matching
// the date's weekday — the program for that day.
export async function computeMonthProgramDays(year: number, month: number) {
  const [rotation, programs] = await Promise.all([
    getOrCreateRotation(),
    prisma.trainingProgram.findMany({
      include: {
        days: {
          orderBy: { order: "asc" },
          include: { slots: { orderBy: { order: "asc" }, include: { movement: true } } },
        },
      },
    }),
  ]);

  const programByWeek = new Map(programs.map((p) => [p.weekNumber, p]));
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const weekNumber = weekNumberForDate(date, rotation.anchorMonday, rotation.anchorWeekNumber);
    const weekdayLabel = weekdayLabelForDate(date);
    const program = programByWeek.get(weekNumber);
    const matchedDay = program?.days.find((day) => matchesWeekday(day.dayLabel, weekdayLabel)) ?? null;

    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      weekNumber,
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

  return { rotation, days };
}
