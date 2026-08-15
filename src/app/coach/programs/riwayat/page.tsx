import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProgramHistoryCalendar, type Snapshot } from "@/components/coach/ProgramHistoryCalendar";

export default async function ProgramHistoryPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const snapshots = await prisma.programSnapshot.findMany({
    where: { createdAt: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) } },
    orderBy: { createdAt: "asc" },
    include: { coach: { select: { name: true } } },
  });

  // Prisma's Date/JsonValue types don't match the client component's plain
  // string/object props — round-trip through JSON to get the same shape
  // the API route sends over the wire.
  const initialSnapshots = JSON.parse(JSON.stringify(snapshots)) as Snapshot[];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/coach/programs" className="text-sm text-accent hover:underline">
          &larr; Kembali ke Program
        </Link>
        <h1 className="font-display text-2xl font-bold">Riwayat Program</h1>
        <p className="text-sm text-muted">Lihat lagi program yang pernah disimpan di tanggal-tanggal sebelumnya.</p>
      </div>

      <ProgramHistoryCalendar initialYear={year} initialMonth={month} initialSnapshots={initialSnapshots} />
    </div>
  );
}
