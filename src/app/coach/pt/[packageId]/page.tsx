import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PtPackageView } from "@/components/coach/PtPackageView";
import { Role } from "@/generated/prisma/client";

export default async function CoachPtPackagePage(props: PageProps<"/coach/pt/[packageId]">) {
  const coach = await getCurrentUser();
  if (!coach) return null;
  const { packageId } = await props.params;
  const pkg = await prisma.ptPackage.findUnique({
    where: { id: packageId },
    include: {
      coach: { select: { id: true, name: true } },
      members: { where: { leftAt: null }, orderBy: { joinedAt: "asc" }, include: { member: { select: { id: true, name: true } } } },
      sessions: { orderBy: { number: "asc" }, include: { slots: { orderBy: { order: "asc" } } } },
    },
  });
  if (!pkg || pkg.endedAt) notFound();
  const mine = pkg.coach.id === coach.id;
  const [movements, members, taken] = await Promise.all([
    prisma.movement.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, category: true, equipment: true, primaryMuscle: true } }),
    mine ? prisma.user.findMany({ where: { role: Role.MEMBER }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
    prisma.ptMember.findMany({ where: { leftAt: null, package: { endedAt: null } }, select: { memberId: true } }),
  ]);
  const inPt = new Set(taken.map((t) => t.memberId));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/coach/pt" className="text-sm text-accent hover:underline">
        &larr; Semua klien PT
      </Link>
      <PtPackageView
        packageId={pkg.id}
        title={pkg.name || pkg.members.map((m) => m.member.name).join(" & ")}
        coachName={pkg.coach.name}
        mine={mine}
        members={pkg.members.map((m) => ({ id: m.member.id, name: m.member.name }))}
        memberOptions={members.map((m) => ({ ...m, inPt: inPt.has(m.id) }))}
        movements={movements}
        sessions={pkg.sessions.map((s) => ({
          number: s.number,
          title: s.title ?? "",
          heldOn: s.heldOn?.toISOString().slice(0, 10) ?? null,
          slots: s.slots.map((x) => ({
            slotLabel: x.slotLabel ?? "",
            movementId: x.movementId,
            sets: x.sets != null ? String(x.sets) : "",
            repTarget: x.repTarget ?? "",
            note: x.note ?? "",
            roundScheme: x.roundScheme ?? "",
          })),
        }))}
      />
    </div>
  );
}
