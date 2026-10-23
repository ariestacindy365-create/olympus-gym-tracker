import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { getClassSchedule } from "@/lib/classSchedule";
import { CLASS_SESSIONS, minuteOfDay } from "@/lib/classSessions";
import { setVolume } from "@/lib/setUnits";
import { Role } from "@/generated/prisma/client";

export interface RecapMember {
  id: string;
  name: string;
  sets: number;
  volume: number;
  prs: number;
  /** Their saved workout today (for 💪), null until they press Simpan. */
  workoutId: string | null;
  kudoed: boolean;
}

export interface RecapClass {
  sessionId: string;
  /** "09:00" */
  time: string;
  started: boolean;
  members: RecapMember[];
}

/**
 * Today's classes of one coach with the members who trained in each: by
 * the class saved with their workout, else the class running when they
 * logged their first set (15 min grace before the bell), same as the
 * member's own "Kelas" detection.
 */
export async function getClassRecap(coachId: string): Promise<RecapClass[]> {
  const today = todayDateKey();
  const weekday = today.getUTCDay();
  const schedule = (await getClassSchedule()).filter((e) => e.weekday === weekday && e.coach);
  const options = CLASS_SESSIONS.filter((s) => schedule.some((e) => e.sessionId === s.id)).map((session) => ({
    session,
    coach: schedule.find((e) => e.sessionId === session.id)!.coach!,
  }));
  const mine = options.filter((o) => o.coach.id === coachId);
  if (mine.length === 0) return [];

  const [sets, workouts] = await Promise.all([
    prisma.setEntry.findMany({
      where: { workoutDate: today, member: { role: Role.MEMBER } },
      select: { memberId: true, createdAt: true, weight: true, reps: true, unit: true, perSide: true, isPR: true, member: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workout.findMany({
      where: { workoutDate: today },
      select: { id: true, memberId: true, classLabel: true, kudos: { where: { memberId: coachId }, select: { memberId: true } } },
    }),
  ]);
  const workoutOf = new Map(workouts.map((w) => [w.memberId, w]));

  const byMember = new Map<string, RecapMember & { firstAt: Date }>();
  for (const s of sets) {
    const m = byMember.get(s.memberId) ?? {
      id: s.memberId,
      name: s.member.name,
      sets: 0,
      volume: 0,
      prs: 0,
      workoutId: workoutOf.get(s.memberId)?.id ?? null,
      kudoed: (workoutOf.get(s.memberId)?.kudos.length ?? 0) > 0,
      firstAt: s.createdAt,
    };
    m.sets += 1;
    m.volume += setVolume(s);
    if (s.isPR) m.prs += 1;
    byMember.set(s.memberId, m);
  }

  const classOf = (m: { id: string; firstAt: Date }) => {
    const label = workoutOf.get(m.id)?.classLabel;
    if (label) {
      const [coachName, time] = label.split(" · ");
      const saved = options.find((o) => o.coach.name === coachName && o.session.name.startsWith(time));
      if (saved) return saved.session.id;
    }
    const minute = minuteOfDay(m.firstAt) + 15;
    const started = options.filter((o) => o.session.startMinute <= minute);
    return (started[started.length - 1] ?? options[0]).session.id;
  };

  const now = minuteOfDay(new Date());
  return mine.map((o) => ({
    sessionId: o.session.id,
    time: o.session.name.slice(0, 5),
    started: now >= o.session.startMinute,
    members: [...byMember.values()]
      .filter((m) => classOf(m) === o.session.id)
      .map((m) => ({
        id: m.id,
        name: m.name,
        sets: m.sets,
        volume: Math.round(m.volume),
        prs: m.prs,
        workoutId: m.workoutId,
        kudoed: m.kudoed,
      }))
      .sort((a, b) => b.volume - a.volume || a.name.localeCompare(b.name)),
  }));
}
