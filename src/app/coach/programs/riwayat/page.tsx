import Link from "next/link";
import { ProgramHistoryCalendar } from "@/components/coach/ProgramHistoryCalendar";
import { computeMonthProgramDays } from "@/lib/programHistory";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgramVersionList, type ProgramVersion } from "@/components/coach/ProgramVersionList";
import type { SnapshotData } from "@/lib/programSave";

export default async function ProgramHistoryPage() {
  const coach = await getCurrentUser();
  if (!coach) return null;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const [{ rotation, days, currentWeek }, snapshots] = await Promise.all([
    computeMonthProgramDays(year, month, coach.id),
    prisma.programSnapshot.findMany({ where: { coachId: coach.id }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  const seenWeek = new Set<number>();
  const versions: ProgramVersion[] = snapshots.map((s) => {
    const current = !seenWeek.has(s.weekNumber);
    seenWeek.add(s.weekNumber);
    return { id: s.id, weekNumber: s.weekNumber, savedAt: s.createdAt.toISOString(), current, data: s.data as unknown as SnapshotData };
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/coach/programs" className="text-sm text-accent hover:underline">
          &larr; Kembali ke Program
        </Link>
        <h1 className="font-display text-2xl font-bold">Riwayat Program</h1>
        <p className="text-sm text-muted">
          Lihat program yang berlaku di tanggal tertentu, dihitung dari hari dalam minggu — bukan dari kapan kamu
          buat/simpannya.
        </p>
      </div>

      <ProgramHistoryCalendar
        initialYear={year}
        initialMonth={month}
        initialDays={days}
        initialRotation={{ anchorMonday: rotation.anchorMonday.toISOString(), anchorWeekNumber: rotation.anchorWeekNumber, weeks: rotation.weeks }}
        initialCurrentWeek={currentWeek}
      />

      <ProgramVersionList versions={versions} weekCount={rotation.weeks} />
    </div>
  );
}
