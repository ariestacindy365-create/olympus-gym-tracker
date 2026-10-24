import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { getThisWeekProgramRaw } from "@/lib/weekProgram";
import { matchesWeekday, weekdayLabelForDate } from "@/lib/programRotation";
import { formatRepTarget } from "@/lib/programSlide";
import { schemeLine } from "@/lib/roundScheme";
import { musclesFor, type MuscleWeights } from "@/lib/muscles";
import { amountFromTarget, perSideFromTarget, unitFromTarget, type SetUnit } from "@/lib/setUnits";
import { classLabel, type TodayClasses } from "@/lib/classSchedule";
import { needsLoadInput } from "@/lib/loadInput";

export interface PlanItem {
  label: string;
  exerciseId: string;
  name: string;
  /** Rows to show (the round's set count; 1 for AMRAP / TABATA / FOR TIME rounds). */
  sets: number;
  /** As written on the slide, e.g. "12 reps", "30\\"", "1 lap". */
  target: string;
  /** Reps to prefill when the target is a plain number. */
  repDefault: number | null;
  /** What the number counts, read from the target: `30"` → detik, "1 lap" → lap, "7 kal" → kal. */
  unit: SetUnit;
  /** "10 reps each": the number is per side, and volume counts both sides. */
  perSide: boolean;
  muscles: MuscleWeights;
  /** Coach's note on the slot (e.g. "tempo 3-1-1"). */
  note: string | null;
  /** TABATA finisher or a bodyweight / banded move: just done, not logged (the member can still log it). */
  noInput: boolean;
}

export interface PlanRound {
  number: number;
  schemeLine: string;
  items: PlanItem[];
}

export interface PlanClass {
  sessionId: string;
  /** "Coach Ari · 09:00" */
  label: string;
}

export interface TodayPlan {
  dayLabel: string;
  title: string;
  rounds: PlanRound[];
  /** The member's class today, and today's other classes to switch to. */
  klass: PlanClass | null;
  classOptions: PlanClass[];
  /** Whose program this is, when it isn't the class coach's own (they haven't written this week). */
  borrowedFrom: string | null;
}

function roundKey(label: string): string {
  const m = label.trim().toUpperCase().match(/^([A-Z]+)/);
  return m ? m[1] : label.trim().toUpperCase() || "_";
}

/** "12" / "10 reps each" / "8-10" → 12 / 10 / 8; units like 30" or 1 lap → null. */
function repDefaultOf(rep: string | null): number | null {
  const r = (rep ?? "").trim().toLowerCase();
  const m = r.match(/^(\d+)(?:\s*[-–]\s*\d+)?(?:\s*(reps?|x|kali)(\s*each|\s*per\s*side|\s*kanan.*)?)?$/);
  return m ? Number(m[1]) : null;
}

/**
 * Today's class program as a fill-in workout: every slot of today's day with
 * its set rows. Program movements are matched to the member log's exercises
 * by name (created when missing) so the sets land in the normal history,
 * PRs and leaderboard.
 */
export async function getTodayPlan(classes: TodayClasses, on?: Date): Promise<TodayPlan | null> {
  const coach = classes.current?.coach ?? null;
  const key = on ?? todayDateKey();
  const weekday = weekdayLabelForDate(new Date(key.getUTCFullYear(), key.getUTCMonth(), key.getUTCDate()));
  const { program } = await getThisWeekProgramRaw(coach?.id ?? null, weekday, on);
  const day = program?.days.find((d) => matchesWeekday(d.dayLabel, weekday));
  if (!day || day.slots.length === 0) return null;

  const names = [...new Set(day.slots.map((s) => s.movement.name.trim()))];
  let exercises = await prisma.exercise.findMany({ where: { name: { in: names, mode: "insensitive" } } });
  const have = new Set(exercises.map((e) => e.name.toLowerCase()));
  const missing = names.filter((n) => !have.has(n.toLowerCase()));
  if (missing.length > 0) {
    await prisma.exercise.createMany({ data: missing.map((name) => ({ name })), skipDuplicates: true });
    exercises = await prisma.exercise.findMany({ where: { name: { in: names, mode: "insensitive" } } });
  }
  const exerciseByName = new Map(exercises.map((e) => [e.name.toLowerCase(), e]));

  const rounds: { scheme: string; sets: string; items: PlanItem[] }[] = [];
  let currentKey: string | null = null;
  for (const s of day.slots) {
    const label = (s.slotLabel ?? "").trim();
    const key: string | null = label ? roundKey(label) : currentKey;
    if (rounds.length === 0 || key !== currentKey) {
      rounds.push({ scheme: (s.roundScheme ?? "").trim(), sets: s.sets != null ? String(s.sets) : "", items: [] });
    }
    currentKey = key;
    const round = rounds[rounds.length - 1];
    const exercise = exerciseByName.get(s.movement.name.trim().toLowerCase());
    if (!exercise) continue;
    const setCount = Number(s.sets ?? round.sets) || 1;
    round.items.push({
      label,
      exerciseId: exercise.id,
      name: s.movement.name,
      sets: Math.min(10, Math.max(1, setCount)),
      target: formatRepTarget(s.repTarget),
      repDefault: unitFromTarget(s.repTarget) === "REPS" ? repDefaultOf(s.repTarget) : amountFromTarget(s.repTarget),
      unit: unitFromTarget(s.repTarget),
      perSide: perSideFromTarget(s.repTarget),
      muscles: musclesFor(s.movement.name, s.movement.primaryMuscle, s.movement.secondaryMuscle),
      note: s.note?.trim() || null,
      noInput: !needsLoadInput(s.movement.name, s.movement.equipment, round.scheme),
    });
  }

  return {
    dayLabel: day.dayLabel,
    title: day.focusLabel?.trim() || day.dayLabel,
    rounds: rounds
      .filter((r) => r.items.length > 0)
      .map((r, i) => ({ number: i + 1, schemeLine: schemeLine(r.scheme, r.sets), items: r.items })),
    klass: classes.current ? { sessionId: classes.current.session.id, label: classLabel(classes.current) } : null,
    classOptions: classes.options.map((o) => ({ sessionId: o.session.id, label: classLabel(o) })),
    borrowedFrom: coach && program && program.coachId !== coach.id ? program.coach.name : null,
  };
}
