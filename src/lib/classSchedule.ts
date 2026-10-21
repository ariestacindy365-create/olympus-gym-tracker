import { prisma } from "@/lib/prisma";
import { CLASS_SESSIONS, minuteOfDay, type ClassSession } from "@/lib/classSessions";
import { todayDateKey } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

/** Weekdays with classes, Date.getDay() numbering. */
export const CLASS_WEEKDAYS = [
  { weekday: 1, label: "Senin" },
  { weekday: 2, label: "Selasa" },
  { weekday: 3, label: "Rabu" },
  { weekday: 4, label: "Kamis" },
  { weekday: 5, label: "Jumat" },
  { weekday: 6, label: "Sabtu" },
];

// The gym's timetable, used to fill ClassSlot the first time it's read.
// Coaches are matched by a word in their name ("Coach Ari" → ari).
const MWF = { "class-1": "cindy", "class-2": "ari", "class-3": "cindy", "class-4": "ari", "class-5": "cindy", "class-6": "ari" };
const TTS = { "class-1": "cindy", "class-2": "ari", "class-3": "ari", "class-4": "ari", "class-5": "cindy", "class-6": "cindy" };
const DEFAULT_SCHEDULE: Record<number, Record<string, string>> = { 1: MWF, 2: TTS, 3: MWF, 4: TTS, 5: MWF, 6: TTS };
// Programs written before each coach had their own all belong to Coach Cindy.
const LEGACY_PROGRAM_OWNER = "cindy";

function coachByWord(coaches: { id: string; name: string }[], word: string) {
  const re = new RegExp(`\\b${word}\\b`, "i");
  return coaches.find((c) => re.test(c.name)) ?? null;
}

export interface ScheduleEntry {
  weekday: number;
  sessionId: string;
  coach: { id: string; name: string } | null;
}

/** Every weekday × class time with its coach. Seeds the default timetable on first use. */
export async function getClassSchedule(): Promise<ScheduleEntry[]> {
  let rows = await prisma.classSlot.findMany({ include: { coach: { select: { id: true, name: true } } } });
  if (rows.length === 0) {
    const coaches = await prisma.user.findMany({ where: { role: Role.COACH }, select: { id: true, name: true } });
    await prisma.classSlot.createMany({
      data: CLASS_WEEKDAYS.flatMap(({ weekday }) =>
        CLASS_SESSIONS.map((s) => ({
          weekday,
          sessionId: s.id,
          coachId: coachByWord(coaches, DEFAULT_SCHEDULE[weekday][s.id])?.id ?? null,
        }))
      ),
      skipDuplicates: true,
    });
    // One-time hand-over of the old shared program, done with the seed so it
    // only ever runs once.
    const owner = coachByWord(coaches, LEGACY_PROGRAM_OWNER);
    if (owner) await prisma.trainingProgram.updateMany({ data: { coachId: owner.id } });
    rows = await prisma.classSlot.findMany({ include: { coach: { select: { id: true, name: true } } } });
  }
  return rows.map((r) => ({ weekday: r.weekday, sessionId: r.sessionId, coach: r.coach }));
}

export interface TodayClass {
  session: ClassSession;
  coach: { id: string; name: string } | null;
}

export interface TodayClasses {
  /** The class the member is following today (null on Sunday / no classes). */
  current: TodayClass | null;
  /** All of today's classes, for the "Ganti kelas" picker. */
  options: TodayClass[];
}

/**
 * Which class a member is in today, in order of preference: the class they
 * picked, the class they were training in (first set logged today), the
 * class running now, the next one today, else today's last class.
 */
export async function resolveTodayClass(opts: {
  picked?: string | null;
  firstSetAt?: Date | null;
  now?: Date;
}): Promise<TodayClasses> {
  const weekday = todayDateKey().getUTCDay();
  const schedule = await getClassSchedule();
  const bySession = new Map(schedule.filter((e) => e.weekday === weekday).map((e) => [e.sessionId, e.coach]));
  if (bySession.size === 0) return { current: null, options: [] };
  const options = CLASS_SESSIONS.filter((s) => bySession.has(s.id)).map((session) => ({
    session,
    coach: bySession.get(session.id) ?? null,
  }));

  const today = todayDateKey().toISOString().slice(0, 10);
  const [pickedDate, pickedId] = (opts.picked ?? "").split("|");
  const picked = pickedDate === today ? options.find((o) => o.session.id === pickedId) : undefined;
  if (picked) return { current: picked, options };

  const at = (m: number) => {
    // Latest class that started at or before minute m.
    const started = options.filter((o) => o.session.startMinute <= m);
    return started[started.length - 1] ?? null;
  };
  if (opts.firstSetAt) {
    // A few minutes' grace: sets logged just before the bell count for that class.
    const c = at(minuteOfDay(opts.firstSetAt) + 15);
    if (c) return { current: c, options };
  }
  const m = minuteOfDay(opts.now ?? new Date());
  const running = options.find((o) => m >= o.session.startMinute && m < o.session.endMinute);
  const next = options.find((o) => o.session.startMinute > m);
  return { current: running ?? next ?? options[options.length - 1], options };
}

/** "Coach Ari · 09:00" */
export function classLabel(c: TodayClass) {
  return `${c.coach?.name ?? "Kelas"} · ${c.session.name.slice(0, 5)}`;
}
