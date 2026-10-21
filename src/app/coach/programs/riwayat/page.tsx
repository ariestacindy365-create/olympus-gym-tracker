import Link from "next/link";
import { ProgramHistoryCalendar } from "@/components/coach/ProgramHistoryCalendar";
import { computeMonthProgramDays } from "@/lib/programHistory";
import { getCurrentUser } from "@/lib/auth";

export default async function ProgramHistoryPage() {
  const coach = await getCurrentUser();
  if (!coach) return null;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const { rotation, days, currentWeek } = await computeMonthProgramDays(year, month, coach.id);

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
        initialRotation={{ anchorMonday: rotation.anchorMonday.toISOString(), anchorWeekNumber: rotation.anchorWeekNumber }}
        initialCurrentWeek={currentWeek}
      />
    </div>
  );
}
