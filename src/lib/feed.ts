import { prisma } from "@/lib/prisma";
import { Role, WorkoutVisibility } from "@/generated/prisma/client";
import { musclesByExerciseName, summarizeSets, type DaySummary } from "@/lib/workoutSummary";

/** Feed rules: ALL = every member and coach, COACH = owner + coaches, PRIVATE = owner only. */
export function canSeeWorkout(w: { memberId: string; visibility: WorkoutVisibility }, viewer: { id: string; role: Role }) {
  if (w.memberId === viewer.id) return true;
  if (w.visibility === WorkoutVisibility.ALL) return true;
  return w.visibility === WorkoutVisibility.COACH && viewer.role === Role.COACH;
}

export interface FeedPost {
  id: string;
  memberName: string;
  mine: boolean;
  title: string;
  note: string | null;
  classLabel: string | null;
  createdAt: string;
  durationSec: number;
  totalVolume: number;
  prCount: number;
  visibility: WorkoutVisibility;
  kudos: number;
  kudoed: boolean;
  comments: number;
  summary: Pick<DaySummary, "lines" | "levels">;
}

/** `classOf`: only workouts saved from that coach's classes ("Coach Ari · …"). */
export async function getFeed(viewer: { id: string; role: Role }, take = 30, classOf?: string): Promise<FeedPost[]> {
  const workouts = await prisma.workout.findMany({
    where: {
      ...(viewer.role === Role.COACH
        ? { OR: [{ visibility: { in: [WorkoutVisibility.ALL, WorkoutVisibility.COACH] } }, { memberId: viewer.id }] }
        : { OR: [{ visibility: WorkoutVisibility.ALL }, { memberId: viewer.id }] }),
      ...(classOf ? { classLabel: { startsWith: `${classOf} · ` } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      member: { select: { name: true } },
      kudos: { select: { memberId: true } },
      _count: { select: { comments: true } },
    },
  });
  // Every post's sets in one query, and the muscles of all their exercises
  // in one more (instead of two queries per post).
  const dayKey = (memberId: string, date: Date) => `${memberId}|${date.getTime()}`;
  const allSets = workouts.length
    ? await prisma.setEntry.findMany({
        where: { OR: workouts.map((w) => ({ memberId: w.memberId, workoutDate: w.workoutDate })) },
        select: { memberId: true, workoutDate: true, weight: true, reps: true, unit: true, isPR: true, createdAt: true, exercise: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const setsByDay = new Map<string, typeof allSets>();
  for (const st of allSets) {
    const k = dayKey(st.memberId, st.workoutDate);
    setsByDay.set(k, [...(setsByDay.get(k) ?? []), st]);
  }
  const muscles = await musclesByExerciseName([...new Set(allSets.map((st) => st.exercise.name))]);

  return Promise.all(
    workouts.map(async (w) => {
      const s = await summarizeSets(setsByDay.get(dayKey(w.memberId, w.workoutDate)) ?? [], muscles);
      return {
        id: w.id,
        memberName: w.member.name,
        mine: w.memberId === viewer.id,
        title: w.title,
        note: w.note,
        classLabel: w.classLabel,
        createdAt: w.createdAt.toISOString(),
        // From the sets themselves, so posts saved late show the real length.
        durationSec: s.durationSec,
        totalVolume: w.totalVolume,
        prCount: w.prCount,
        visibility: w.visibility,
        kudos: w.kudos.length,
        kudoed: w.kudos.some((k) => k.memberId === viewer.id),
        comments: w._count.comments,
        summary: { lines: s.lines, levels: s.levels },
      };
    })
  );
}
