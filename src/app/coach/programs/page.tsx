import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProgramEditor } from "@/components/coach/ProgramEditor";
import { SlideShowButton } from "@/components/coach/SlideShowButton";
import { getThisWeekProgram } from "@/lib/weekProgram";
import { getCurrentUser } from "@/lib/auth";
import { CopyProgramButton } from "@/components/coach/CopyProgramButton";

export default async function CoachProgramsPage() {
  const coach = await getCurrentUser();
  if (!coach) return null;
  const [programs, movements, thisWeek, others] = await Promise.all([
    prisma.trainingProgram.findMany({
      where: { coachId: coach.id },
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
    getThisWeekProgram(coach.id),
    prisma.trainingProgram.findMany({
      where: { coachId: { not: coach.id }, days: { some: { slots: { some: {} } } } },
      select: { weekNumber: true, coach: { select: { id: true, name: true } } },
    }),
  ]);
  const otherCoaches = new Map<string, { id: string; name: string; weeks: number[] }>();
  for (const p of others) {
    const c = otherCoaches.get(p.coach.id) ?? { ...p.coach, weeks: [] };
    c.weeks.push(p.weekNumber);
    otherCoaches.set(p.coach.id, c);
  }
  for (const c of otherCoaches.values()) c.weeks.sort();

  const initialWeeks: Record<number, ReturnType<typeof mapDays>> = {};
  for (let w = 1; w <= 4; w++) {
    const program = programs.find((p) => p.weekNumber === w);
    initialWeeks[w] = mapDays(program?.days ?? []);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Program Latihan {coach.name}</h1>
          <p className="text-sm text-muted">
            Program mingguan untuk kelas yang kamu ajar. Member di kelasmu otomatis melihat program ini sesuai{" "}
            <Link href="/coach/jadwal" className="font-semibold text-accent hover:underline">
              jadwal kelas
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <SlideShowButton slides={thisWeek.days} label={`▶ Slideshow Minggu ${thisWeek.weekNumber}`} />
          <Link
            href="/coach/programs/riwayat"
            className="whitespace-nowrap text-sm font-semibold text-accent hover:underline"
          >
            📅 Riwayat
          </Link>
        </div>
      </div>

      {otherCoaches.size > 0 && <CopyProgramButton coaches={[...otherCoaches.values()]} />}

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
      roundScheme: string | null;
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
      roundScheme: s.roundScheme ?? "",
    })),
  }));
}
