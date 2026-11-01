import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { PtManager, type PtPackageSummary } from "@/components/coach/PtManager";
import { Role } from "@/generated/prisma/client";

export default async function CoachPtPage() {
  const coach = await getCurrentUser();
  if (!coach) return null;
  const [packages, members] = await Promise.all([
    prisma.ptPackage.findMany({
      where: { endedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        coach: { select: { id: true, name: true } },
        members: { where: { leftAt: null }, orderBy: { joinedAt: "asc" }, include: { member: { select: { id: true, name: true } } } },
        sessions: { select: { number: true, heldOn: true, _count: { select: { slots: true } } }, orderBy: { number: "asc" } },
      },
    }),
    prisma.user.findMany({ where: { role: Role.MEMBER }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const summaries: PtPackageSummary[] = packages.map((p) => {
    const next = p.sessions.find((s) => !s.heldOn && s._count.slots > 0);
    return {
      id: p.id,
      name: p.name,
      coachName: p.coach.name,
      mine: p.coach.id === coach.id,
      members: p.members.map((m) => m.member.name),
      sessionsDone: p.sessions.filter((s) => s.heldOn).length,
      nextSession: next?.number ?? null,
    };
  });
  const inPt = new Set(packages.flatMap((p) => p.members.map((m) => m.memberId)));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Personal training"
        title="Klien PT"
        subtitle="Jadikan member klien PT, sendiri atau couple/grup kecil dalam satu paket. Program PT ditulis per sesi."
      />
      <PtManager packages={summaries} members={members.map((m) => ({ ...m, inPt: inPt.has(m.id) }))} />
    </div>
  );
}
