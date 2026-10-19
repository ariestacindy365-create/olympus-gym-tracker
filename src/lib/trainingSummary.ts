import { mondayOf } from "@/lib/programRotation";

interface SetLike {
  workoutDate: Date;
  weight: number;
  reps: number;
  isPR: boolean;
  exercise: { name: string };
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  volume: number;
  /** 0 = no training, 1-4 = relative volume bucket */
  level: number;
  future: boolean;
}

export interface TrainingSummaryData {
  weekStreak: number;
  volumeThisWeek: number;
  daysThisMonth: number;
  latestPR: { exerciseName: string; weight: number; reps: number; date: string } | null;
  /** HEATMAP_WEEKS columns × 7 rows (Mon→Sun), oldest week first. */
  heatmap: HeatmapDay[][];
}

export const HEATMAP_WEEKS = 12;

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Member home-page stats, computed from the member's own sets (already
// loaded by the dashboard): weekly streak, this week's volume, training
// days this month, latest PR, and a 12-week training heatmap.
export function computeTrainingSummary(sets: SetLike[], now = new Date()): TrainingSummaryData {
  const volumeByDay = new Map<string, number>();
  for (const s of sets) {
    const key = dayKey(s.workoutDate);
    volumeByDay.set(key, (volumeByDay.get(key) ?? 0) + s.weight * s.reps);
  }

  const thisMonday = mondayOf(now);
  const weekKey = (d: Date) => mondayOf(d).getTime();
  const trainedWeeks = new Set(sets.map((s) => weekKey(s.workoutDate)));

  // Consecutive weeks with ≥1 session, ending this week — or last week, so
  // the streak doesn't look broken on a Monday before the first session.
  let weekStreak = 0;
  const cursor = new Date(thisMonday);
  if (!trainedWeeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  while (trainedWeeks.has(cursor.getTime())) {
    weekStreak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  let volumeThisWeek = 0;
  for (const s of sets) if (s.workoutDate >= thisMonday) volumeThisWeek += s.weight * s.reps;

  const monthDays = new Set(
    sets
      .filter((s) => s.workoutDate.getFullYear() === now.getFullYear() && s.workoutDate.getMonth() === now.getMonth())
      .map((s) => dayKey(s.workoutDate))
  );

  const prs = sets.filter((s) => s.isPR).sort((a, b) => b.workoutDate.getTime() - a.workoutDate.getTime());
  const latestPR = prs[0]
    ? { exerciseName: prs[0].exercise.name, weight: prs[0].weight, reps: prs[0].reps, date: prs[0].workoutDate.toISOString() }
    : null;

  const start = new Date(thisMonday);
  start.setDate(start.getDate() - (HEATMAP_WEEKS - 1) * 7);
  const visible = [...volumeByDay.entries()].filter(([k]) => k >= dayKey(start)).map(([, v]) => v);
  const max = Math.max(1, ...visible);
  const today = dayKey(now);
  const heatmap: HeatmapDay[][] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = dayKey(date);
      const volume = volumeByDay.get(key) ?? 0;
      week.push({
        date: key,
        volume,
        level: volume === 0 ? 0 : Math.min(4, Math.ceil((volume / max) * 4)),
        future: key > today,
      });
    }
    heatmap.push(week);
  }

  return { weekStreak, volumeThisWeek, daysThisMonth: monthDays.size, latestPR, heatmap };
}
