import { prisma } from "@/lib/prisma";
import { dateKeyOf } from "@/lib/workout";
import { formatKg } from "@/lib/volumeStory";
import { formatAmount, type SetUnit } from "@/lib/setUnits";

/** What a PT client did on a movement last time, shown under it while logging a session. */
export interface PreviousNote {
  /** "Sesi 3 · Sel, 10 Nov", or "Sebelumnya · Sel, 10 Nov" when no session was held that day. */
  label: string;
  /** "60 kg × 8 · 60 kg × 8 · 62,5 kg × 6" */
  sets: string | null;
  notes: string[];
}

export const previousKey = (memberId: string, exerciseId: string) => `${memberId}|${exerciseId}`;

/**
 * For each client and movement of a PT session: their last training day
 * before today with that movement (sets or a coach note about it), and
 * everything from that day — the sets, the set notes, and coach notes whose
 * "Tentang" is the movement. Nothing earlier, so the coach sees one session.
 */
export async function previousNotes({
  packageId,
  memberIds,
  exercises,
  before,
}: {
  packageId: string;
  memberIds: string[];
  exercises: { id: string; name: string }[];
  before: Date;
}): Promise<Record<string, PreviousNote>> {
  if (memberIds.length === 0 || exercises.length === 0) return {};
  const nameOf = new Map(exercises.map((e) => [e.id, e.name.trim().toLowerCase()]));
  const idOfName = new Map(exercises.map((e) => [e.name.trim().toLowerCase(), e.id]));
  const [sets, notes, sessions] = await Promise.all([
    prisma.setEntry.findMany({
      where: { memberId: { in: memberIds }, exerciseId: { in: exercises.map((e) => e.id) }, workoutDate: { lt: before } },
      select: { memberId: true, exerciseId: true, workoutDate: true, setNumber: true, weight: true, reps: true, unit: true, perSide: true, note: true },
      orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
    }),
    prisma.coachNote.findMany({
      where: { memberId: { in: memberIds }, context: { not: null }, createdAt: { lt: new Date(before.getTime() - 7 * 3600_000) } },
      select: { memberId: true, context: true, body: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.ptSession.findMany({ where: { packageId, heldOn: { not: null } }, select: { number: true, heldOn: true } }),
  ]);

  type Day = { sets: typeof sets; notes: string[] };
  // memberId|exerciseId → day key (ms) → what happened that day
  const byKey = new Map<string, Map<number, Day>>();
  const dayOf = (k: string, t: number) => {
    const days = byKey.get(k) ?? new Map<number, Day>();
    byKey.set(k, days);
    const d = days.get(t) ?? { sets: [], notes: [] };
    days.set(t, d);
    return d;
  };
  for (const s of sets) {
    const d = dayOf(previousKey(s.memberId, s.exerciseId), s.workoutDate.getTime());
    d.sets.push(s);
    if (s.note?.trim()) d.notes.push(s.note.trim());
  }
  for (const n of notes) {
    const exerciseId = idOfName.get(n.context!.trim().toLowerCase());
    if (!exerciseId) continue;
    dayOf(previousKey(n.memberId, exerciseId), dateKeyOf(n.createdAt).getTime()).notes.push(n.body.trim());
  }

  const sessionOn = new Map(sessions.map((s) => [s.heldOn!.getTime(), s.number]));
  const out: Record<string, PreviousNote> = {};
  for (const [k, days] of byKey) {
    if (!nameOf.has(k.split("|")[1])) continue;
    const last = Math.max(...days.keys());
    const day = days.get(last)!;
    const date = new Date(last).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    const number = sessionOn.get(last);
    out[k] = {
      label: `${number ? `Sesi ${number}` : "Sebelumnya"} · ${date}`,
      sets: day.sets.length
        ? day.sets
            .map((s) => ((s.unit as SetUnit) === "REPS" ? `${formatKg(s.weight)} kg × ${s.reps}${s.perSide ? "/sisi" : ""}` : formatAmount(s.reps, s.unit as SetUnit, s.perSide)))
            .join(" · ")
        : null,
      notes: [...new Set(day.notes)],
    };
  }
  return out;
}
