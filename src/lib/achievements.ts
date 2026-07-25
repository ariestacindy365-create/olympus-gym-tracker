import "server-only";
import { prisma } from "@/lib/prisma";

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: "KONSISTENSI" | "KEKUATAN" | "VOLUME" | "BODY";
  /** Value the matching MemberStats field must reach to unlock. */
  threshold: number;
  /** Key into MemberStats this achievement tracks, for progress display. */
  statKey: keyof MemberStats;
}

export interface MemberStats {
  distinctTrainingDays: number;
  totalPRs: number;
  totalVolumeKg: number;
  distinctExercises: number;
  bodyMetricEntries: number;
  weightLostKg: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Konsistensi — jumlah hari latihan berbeda
  {
    code: "SESSIONS_1",
    name: "Langkah Pertama",
    description: "Catat set pertamamu",
    icon: "🥇",
    category: "KONSISTENSI",
    threshold: 1,
    statKey: "distinctTrainingDays",
  },
  {
    code: "SESSIONS_10",
    name: "Pemanasan",
    description: "Latihan di 10 hari berbeda",
    icon: "🔥",
    category: "KONSISTENSI",
    threshold: 10,
    statKey: "distinctTrainingDays",
  },
  {
    code: "SESSIONS_25",
    name: "Konsisten",
    description: "Latihan di 25 hari berbeda",
    icon: "💪",
    category: "KONSISTENSI",
    threshold: 25,
    statKey: "distinctTrainingDays",
  },
  {
    code: "SESSIONS_50",
    name: "Veteran",
    description: "Latihan di 50 hari berbeda",
    icon: "🏅",
    category: "KONSISTENSI",
    threshold: 50,
    statKey: "distinctTrainingDays",
  },
  {
    code: "SESSIONS_100",
    name: "Legenda Gym",
    description: "Latihan di 100 hari berbeda",
    icon: "👑",
    category: "KONSISTENSI",
    threshold: 100,
    statKey: "distinctTrainingDays",
  },
  // Kekuatan — jumlah PR
  {
    code: "PR_1",
    name: "Rekor Pertama",
    description: "Cetak personal record pertamamu",
    icon: "✨",
    category: "KEKUATAN",
    threshold: 1,
    statKey: "totalPRs",
  },
  {
    code: "PR_10",
    name: "Pemecah Rekor",
    description: "Cetak 10 personal record",
    icon: "🏆",
    category: "KEKUATAN",
    threshold: 10,
    statKey: "totalPRs",
  },
  {
    code: "PR_25",
    name: "Mesin PR",
    description: "Cetak 25 personal record",
    icon: "⚡",
    category: "KEKUATAN",
    threshold: 25,
    statKey: "totalPRs",
  },
  // Volume — total kg (berat x reps) yang diangkat sepanjang waktu
  {
    code: "VOLUME_10000",
    name: "10 Ton Klub",
    description: "Total angkatan tembus 10.000kg",
    icon: "🚛",
    category: "VOLUME",
    threshold: 10000,
    statKey: "totalVolumeKg",
  },
  {
    code: "VOLUME_50000",
    name: "50 Ton Klub",
    description: "Total angkatan tembus 50.000kg",
    icon: "🏗️",
    category: "VOLUME",
    threshold: 50000,
    statKey: "totalVolumeKg",
  },
  {
    code: "VOLUME_100000",
    name: "100 Ton Klub",
    description: "Total angkatan tembus 100.000kg",
    icon: "🐘",
    category: "VOLUME",
    threshold: 100000,
    statKey: "totalVolumeKg",
  },
  // Variasi gerakan
  {
    code: "EXERCISES_5",
    name: "Serba Bisa",
    description: "Catat 5 gerakan berbeda",
    icon: "🎯",
    category: "KEKUATAN",
    threshold: 5,
    statKey: "distinctExercises",
  },
  // Body metrics
  {
    code: "BODY_FIRST_LOG",
    name: "Mulai Tracking",
    description: "Catat berat badan pertamamu",
    icon: "📊",
    category: "BODY",
    threshold: 1,
    statKey: "bodyMetricEntries",
  },
  {
    code: "WEIGHT_LOSS_2",
    name: "Progress Nyata",
    description: "Turunkan berat badan 2kg dari awal",
    icon: "⬇️",
    category: "BODY",
    threshold: 2,
    statKey: "weightLostKg",
  },
  {
    code: "WEIGHT_LOSS_5",
    name: "Transformasi",
    description: "Turunkan berat badan 5kg dari awal",
    icon: "🔥",
    category: "BODY",
    threshold: 5,
    statKey: "weightLostKg",
  },
];

export async function computeMemberStats(memberId: string): Promise<MemberStats> {
  const [sets, bodyMetrics] = await Promise.all([
    prisma.setEntry.findMany({
      where: { memberId },
      select: { workoutDate: true, exerciseId: true, weight: true, reps: true, isPR: true },
    }),
    prisma.bodyMetric.findMany({
      where: { memberId },
      orderBy: { recordedDate: "asc" },
      select: { weight: true },
    }),
  ]);

  const distinctTrainingDays = new Set(sets.map((s) => s.workoutDate.getTime())).size;
  const distinctExercises = new Set(sets.map((s) => s.exerciseId)).size;
  const totalPRs = sets.filter((s) => s.isPR).length;
  const totalVolumeKg = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  const bodyMetricEntries = bodyMetrics.length;
  const weightLostKg =
    bodyMetricEntries >= 2 ? Math.max(0, bodyMetrics[0].weight - bodyMetrics[bodyMetricEntries - 1].weight) : 0;

  return { distinctTrainingDays, totalPRs, totalVolumeKg, distinctExercises, bodyMetricEntries, weightLostKg };
}

export interface UnlockedAchievement extends Achievement {
  unlockedAt: Date;
}

// Computes fresh stats, diffs against what's already unlocked, and inserts
// any newly-earned achievements. Safe to call on every set/body-metric save
// (idempotent — @@unique([memberId, achievementCode]) blocks duplicates)
// and also doubles as a backfill pass for members with pre-existing history
// (e.g. the imported real progress data) whenever their achievements page
// is opened.
export async function syncMemberAchievements(memberId: string): Promise<Achievement[]> {
  const [stats, existing] = await Promise.all([
    computeMemberStats(memberId),
    prisma.achievementUnlock.findMany({ where: { memberId }, select: { achievementCode: true } }),
  ]);
  const existingCodes = new Set(existing.map((e) => e.achievementCode));

  const newlyEarned = ACHIEVEMENTS.filter(
    (a) => !existingCodes.has(a.code) && stats[a.statKey] >= a.threshold
  );
  if (newlyEarned.length === 0) return [];

  await prisma.achievementUnlock.createMany({
    data: newlyEarned.map((a) => ({ memberId, achievementCode: a.code })),
    skipDuplicates: true,
  });

  return newlyEarned;
}

export async function getMemberAchievements(memberId: string): Promise<{
  unlocked: UnlockedAchievement[];
  stats: MemberStats;
}> {
  const [stats, unlocks] = await Promise.all([
    computeMemberStats(memberId),
    prisma.achievementUnlock.findMany({ where: { memberId } }),
  ]);
  const unlockedAtByCode = new Map(unlocks.map((u) => [u.achievementCode, u.unlockedAt]));
  const unlocked = ACHIEVEMENTS.filter((a) => unlockedAtByCode.has(a.code)).map((a) => ({
    ...a,
    unlockedAt: unlockedAtByCode.get(a.code)!,
  }));
  return { unlocked, stats };
}
