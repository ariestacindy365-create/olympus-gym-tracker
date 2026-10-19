import { prisma } from "@/lib/prisma";
import type { CoachNoteItem } from "@/lib/coachNoteFormat";

export type { CoachNoteItem };

export async function getCoachNotes(memberId: string, take?: number): Promise<CoachNoteItem[]> {
  const notes = await prisma.coachNote.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { coach: { select: { name: true } } },
    take,
  });
  return notes.map((n) => ({
    id: n.id,
    body: n.body,
    context: n.context,
    coachName: n.coach.name,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
  }));
}
