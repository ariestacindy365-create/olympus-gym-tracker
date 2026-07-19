import { prisma } from "@/lib/prisma";
import { ProgramEditor } from "@/components/coach/ProgramEditor";

export default async function CoachProgramsPage() {
  const [programs, movements] = await Promise.all([
    prisma.trainingProgram.findMany({
      include: {
        days: {
          orderBy: { order: "asc" },
          include: { slots: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.movement.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, equipment: true, primaryMuscle: true },
    }),
  ]);

  const initialWeeks: Record<number, ReturnType<typeof mapDays>> = {};
  for (let w = 1; w <= 4; w++) {
    const program = programs.find((p) => p.weekNumber === w);
    initialWeeks[w] = mapDays(program?.days ?? []);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Program Latihan</h1>
        <p className="text-sm text-muted">Program bootcamp class mingguan, berlaku untuk semua member.</p>
      </div>

      <ProgramEditor movements={movements} initialWeeks={initialWeeks} />
    </div>
  );
}

function mapDays(
  days: {
    dayLabel: string;
    focusLabel: string | null;
    slots: {
      id: string;
      slotLabel: string | null;
      movementId: string;
      sets: number | null;
      repTarget: string | null;
      targetWeight: number | null;
      note: string | null;
    }[];
  }[]
) {
  return days.map((d) => ({
    dayLabel: d.dayLabel,
    focusLabel: d.focusLabel ?? "",
    slots: d.slots.map((s) => ({
      id: s.id,
      slotLabel: s.slotLabel ?? "",
      movementId: s.movementId,
      sets: s.sets != null ? String(s.sets) : "",
      repTarget: s.repTarget ?? "",
      targetWeight: s.targetWeight != null ? String(s.targetWeight) : "",
      note: s.note ?? "",
    })),
  }));
}
