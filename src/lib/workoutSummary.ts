import { prisma } from "@/lib/prisma";
import { musclesFor, muscleLoad, muscleLevels, type MuscleKey, type MuscleWeights } from "@/lib/muscles";

export interface DaySummaryLine {
  exercise: string;
  sets: number;
  volume: number;
  pr: boolean;
}

export interface DaySummary {
  totalVolume: number;
  totalSets: number;
  prCount: number;
  /** Active time: first → last set (long pauses capped) plus a rest after it, max 4h. */
  durationSec: number;
  lines: DaySummaryLine[];
  muscleSets: MuscleWeights;
  levels: Partial<Record<MuscleKey, number>>;
  /** Every set (weight × reps), for the volume story card. */
  sets: { weight: number; reps: number }[];
}

const MAX_DURATION_SEC = 4 * 3600;
// Time counted after the last logged set (finishing it, last rest).
const AFTER_LAST_SET_SEC = 3 * 60;
// A gap longer than this between two sets is a break (left the gym, came
// back later), and only counts up to this much.
const MAX_GAP_SEC = 15 * 60;

/** Muscles for exercise names, using the coach's Movement data when a movement has the same name. */
export async function musclesByExerciseName(names: string[]): Promise<Map<string, MuscleWeights>> {
  const movements = await prisma.movement.findMany({
    where: { name: { in: names, mode: "insensitive" } },
    select: { name: true, primaryMuscle: true, secondaryMuscle: true },
  });
  const byName = new Map(movements.map((m) => [m.name.toLowerCase(), m]));
  return new Map(
    names.map((n) => {
      const m = byName.get(n.toLowerCase());
      return [n, musclesFor(n, m?.primaryMuscle, m?.secondaryMuscle)];
    })
  );
}

type SetRow = { weight: number; reps: number; isPR: boolean; createdAt: Date; exercise: { name: string } };

/**
 * `muscles`: exercise name → muscles, when the caller already looked them up
 * for many workouts at once (the feed); otherwise fetched here.
 */
export async function summarizeSets(sets: SetRow[], muscles?: Map<string, MuscleWeights>): Promise<DaySummary> {
  const byExercise = new Map<string, DaySummaryLine>();
  for (const s of sets) {
    const line = byExercise.get(s.exercise.name) ?? { exercise: s.exercise.name, sets: 0, volume: 0, pr: false };
    line.sets += 1;
    line.volume += s.weight * s.reps;
    line.pr ||= s.isPR;
    byExercise.set(s.exercise.name, line);
  }
  const lines = [...byExercise.values()];
  const muscleMap = muscles ?? (await musclesByExerciseName(lines.map((l) => l.exercise)));
  const muscleSets = muscleLoad(lines.map((l) => ({ muscles: muscleMap.get(l.exercise) ?? {}, sets: l.sets })));
  // Ends at the last set, not when Simpan is tapped, and long pauses between
  // sets are capped: saving hours later, or a second session in the
  // evening, must not stretch the workout (or its calorie estimate).
  const times = sets.map((s) => s.createdAt.getTime()).sort((a, b) => a - b);
  let activeSec = AFTER_LAST_SET_SEC;
  for (let i = 1; i < times.length; i++) activeSec += Math.min(MAX_GAP_SEC, (times[i] - times[i - 1]) / 1000);
  return {
    totalVolume: Math.round(lines.reduce((a, l) => a + l.volume, 0) * 10) / 10,
    totalSets: sets.length,
    prCount: sets.filter((s) => s.isPR).length,
    durationSec: Math.min(MAX_DURATION_SEC, Math.max(60, Math.round(activeSec))),
    lines,
    muscleSets,
    levels: muscleLevels(muscleSets),
    sets: sets.map((s) => ({ weight: s.weight, reps: s.reps })),
  };
}

export async function summarizeDay(memberId: string, workoutDate: Date): Promise<DaySummary> {
  const sets = await prisma.setEntry.findMany({
    where: { memberId, workoutDate },
    select: { weight: true, reps: true, isPR: true, createdAt: true, exercise: { select: { name: true } } },
    orderBy: [{ createdAt: "asc" }],
  });
  return summarizeSets(sets);
}

export { formatDuration } from "@/lib/duration";
