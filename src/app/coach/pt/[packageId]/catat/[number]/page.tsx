import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { planRounds } from "@/lib/todayPlan";
import { PtSessionLogger, type LoggerSet } from "@/components/coach/PtSessionLogger";

// "Catat sesi berdua": the coach logs a PT session for everyone in the
// package on one screen, one column per person. Clients can also log from
// their own phone; both land in the same sets.
export default async function PtSessionLogPage(props: PageProps<"/coach/pt/[packageId]/catat/[number]">) {
  const { packageId, number } = await props.params;
  const session = await prisma.ptSession.findUnique({
    where: { packageId_number: { packageId, number: Number(number) || 0 } },
    include: {
      slots: { orderBy: { order: "asc" }, include: { movement: true } },
      package: { include: { members: { where: { leftAt: null }, orderBy: { joinedAt: "asc" }, include: { member: { select: { id: true, name: true } } } } } },
    },
  });
  if (!session || session.package.endedAt || session.slots.length === 0) notFound();
  const members = session.package.members.map((m) => m.member);
  const rounds = await planRounds(session.slots);
  const exerciseIds = rounds.flatMap((r) => r.items.map((i) => i.exerciseId));
  const today = todayDateKey();
  const sets = await prisma.setEntry.findMany({
    where: { memberId: { in: members.map((m) => m.id) }, exerciseId: { in: exerciseIds }, workoutDate: today },
    select: { memberId: true, exerciseId: true, setNumber: true, weight: true, reps: true, isPR: true },
  });
  const saved: LoggerSet[] = sets.map((s) => ({ ...s }));

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/coach/pt/${packageId}`} className="text-sm text-accent hover:underline">
        &larr; Kembali ke paket PT
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Catat sesi{members.length > 1 ? " berdua" : ""} · hari ini</p>
        <h1 className="font-display text-2xl font-bold">
          Sesi {session.number}
          {session.title && ` · ${session.title}`}
        </h1>
        <p className="text-sm text-muted">Klien juga bisa mencatat dari HP sendiri; catatannya menyatu di sini.</p>
      </div>
      {session.heldOn && session.heldOn.getTime() !== today.getTime() && (
        <p role="status" className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm">
          Sesi {session.number} sudah dilatih{" "}
          {session.heldOn.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}. Set yang dicatat sekarang masuk ke
          latihan hari ini, dan sesi berikutnya tetap jadi sesi klien hari ini.
        </p>
      )}
      <PtSessionLogger sessionId={session.id} members={members} rounds={rounds} saved={saved} />
    </div>
  );
}
