import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProgramEditor } from "@/components/coach/ProgramEditor";
import { Role } from "@/generated/prisma/client";

export default async function CoachProgramMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.role !== Role.MEMBER) {
    notFound();
  }

  const [programs, movements] = await Promise.all([
    prisma.trainingProgram.findMany({
      where: { memberId },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: { slots: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.movement.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, equipment: true },
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
        <h1 className="font-display text-2xl font-bold">Program Latihan — {member.name}</h1>
        <p className="text-sm text-muted">{member.email}</p>
      </div>

      <ProgramEditor memberId={memberId} movements={movements} initialWeeks={initialWeeks} />
    </div>
  );
}

function mapDays(
  days: {
    dayLabel: string;
    focusLabel: string | null;
    slots: {
      slotLabel: string | null;
      movementId: string;
      sets: number | null;
      repTarget: string | null;
      note: string | null;
    }[];
  }[]
) {
  return days.map((d) => ({
    dayLabel: d.dayLabel,
    focusLabel: d.focusLabel ?? "",
    slots: d.slots.map((s) => ({
      slotLabel: s.slotLabel ?? "",
      movementId: s.movementId,
      sets: s.sets != null ? String(s.sets) : "",
      repTarget: s.repTarget ?? "",
      note: s.note ?? "",
    })),
  }));
}
