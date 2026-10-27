import type { Prisma } from "@/generated/prisma/client";

export interface ProgramWeekInput {
  dayLabel: string;
  focusLabel?: string | null;
  slots: {
    slotLabel?: string | null;
    movementId: string;
    sets?: number | null;
    repTarget?: string | null;
    targetWeight?: number | null;
    note?: string | null;
    roundScheme?: string | null;
  }[];
}

/** What a ProgramSnapshot's `data` holds: the week with movement names baked in. */
export interface SnapshotData {
  days: {
    dayLabel: string;
    focusLabel: string | null;
    slots: {
      slotLabel: string | null;
      movementName: string;
      sets: number | null;
      repTarget: string | null;
      targetWeight: number | null;
      note: string | null;
      roundScheme: string | null;
    }[];
  }[];
}

/**
 * Replaces a coach's Minggu N with `days` and records a snapshot of the
 * result, so every save (and every reuse of an old version) shows up in
 * the history. Run inside a transaction.
 */
export async function writeProgramWeek(
  tx: Prisma.TransactionClient,
  coachId: string,
  weekNumber: number,
  days: ProgramWeekInput[]
) {
  // Each coach saves only their own Minggu N.
  const program =
    (await tx.trainingProgram.findFirst({ where: { weekNumber, coachId } })) ??
    (await tx.trainingProgram.create({ data: { weekNumber, coachId } }));
  await tx.trainingProgram.update({ where: { id: program.id }, data: { updatedAt: new Date() } });

  await tx.programDay.deleteMany({ where: { programId: program.id } });

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const day = await tx.programDay.create({
      data: { programId: program.id, dayLabel: d.dayLabel, focusLabel: d.focusLabel ?? null, order: i },
    });
    if (d.slots.length > 0) {
      await tx.programSlot.createMany({
        data: d.slots.map((s, j) => ({
          dayId: day.id,
          slotLabel: s.slotLabel ?? null,
          movementId: s.movementId,
          sets: s.sets ?? null,
          repTarget: s.repTarget ?? null,
          targetWeight: s.targetWeight ?? null,
          note: s.note ?? null,
          roundScheme: s.roundScheme ?? null,
          order: j,
        })),
      });
    }
  }

  const savedDays = await tx.programDay.findMany({
    where: { programId: program.id },
    orderBy: { order: "asc" },
    include: { slots: { orderBy: { order: "asc" }, include: { movement: true } } },
  });

  // Saving again without changes shouldn't stack identical versions.
  const data = toSnapshotData(savedDays);
  const latest = await tx.programSnapshot.findFirst({
    where: { coachId, weekNumber },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  });
  if (stableJson(latest?.data) !== stableJson(data)) {
    await tx.programSnapshot.create({ data: { weekNumber, coachId, data: data as unknown as Prisma.InputJsonValue } });
  }

  return savedDays;
}

/** JSON with object keys sorted: Postgres jsonb doesn't keep key order. */
function stableJson(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x
  );
}

type DayWithSlots = {
  dayLabel: string;
  focusLabel: string | null;
  slots: {
    slotLabel: string | null;
    movement: { name: string };
    sets: number | null;
    repTarget: string | null;
    targetWeight: number | null;
    note: string | null;
    roundScheme: string | null;
  }[];
};

// Movement names are baked in — the live rows only keep movementId, so
// without this a snapshot would go stale if a movement is later renamed or
// deleted.
function toSnapshotData(days: DayWithSlots[]): SnapshotData {
  return {
    days: days.map((d) => ({
      dayLabel: d.dayLabel,
      focusLabel: d.focusLabel,
      slots: d.slots.map((s) => ({
        slotLabel: s.slotLabel,
        movementName: s.movement.name,
        sets: s.sets,
        repTarget: s.repTarget,
        targetWeight: s.targetWeight,
        note: s.note,
        roundScheme: s.roundScheme,
      })),
    })),
  };
}

/**
 * Snapshots a coach's Minggu N as it is now, if it has content but no
 * saved version yet — so replacing it never loses a program that predates
 * the history.
 */
export async function ensureSnapshot(tx: Prisma.TransactionClient, coachId: string, weekNumber: number) {
  if (await tx.programSnapshot.findFirst({ where: { coachId, weekNumber }, select: { id: true } })) return;
  const program = await tx.trainingProgram.findFirst({
    where: { coachId, weekNumber },
    include: { days: { orderBy: { order: "asc" }, include: { slots: { orderBy: { order: "asc" }, include: { movement: true } } } } },
  });
  if (!program || !program.days.some((d) => d.slots.length > 0)) return;
  await tx.programSnapshot.create({
    data: { weekNumber, coachId, data: toSnapshotData(program.days) as unknown as Prisma.InputJsonValue },
  });
}
