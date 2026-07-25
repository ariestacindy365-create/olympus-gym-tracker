import "server-only";
import { prisma } from "@/lib/prisma";

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: "KONSISTENSI" | "KEKUATAN" | "VOLUME" | "BODY" | "LOYALITAS";
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
  /** Heaviest single-set weight ever lifted, divided by the latest logged body weight. */
  bodyweightMultiple: number;
  /** Days since the member's account was created. */
  membershipDays: number;
  /** Most distinct training days ever logged within a single ISO week. */
  maxWeeklyTrainingDays: number;
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
  // Konsistensi — jumlah hari latihan berbeda dalam 1 minggu yang sama
  {
    code: "WEEKLY_3",
    name: "Rutin Mingguan",
    description: "Latihan 3 hari dalam 1 minggu",
    icon: "🗓️",
    category: "KONSISTENSI",
    threshold: 3,
    statKey: "maxWeeklyTrainingDays",
  },
  {
    code: "WEEKLY_4",
    name: "Semangat Mingguan",
    description: "Latihan 4 hari dalam 1 minggu",
    icon: "📅",
    category: "KONSISTENSI",
    threshold: 4,
    statKey: "maxWeeklyTrainingDays",
  },
  {
    code: "WEEKLY_5",
    name: "Gila Latihan",
    description: "Latihan 5 hari dalam 1 minggu",
    icon: "🌟",
    category: "KONSISTENSI",
    threshold: 5,
    statKey: "maxWeeklyTrainingDays",
  },
  {
    code: "WEEKLY_6",
    name: "Tanpa Ampun",
    description: "Latihan 6 hari dalam 1 minggu",
    icon: "💥",
    category: "KONSISTENSI",
    threshold: 6,
    statKey: "maxWeeklyTrainingDays",
  },
  // Loyalitas — lama bergabung jadi member
  {
    code: "MEMBER_1_MONTH",
    name: "1 Bulan Bergabung",
    description: "Sudah jadi member OLYMPUS selama 1 bulan",
    icon: "🌱",
    category: "LOYALITAS",
    threshold: 30,
    statKey: "membershipDays",
  },
  {
    code: "MEMBER_3_MONTHS",
    name: "3 Bulan Bergabung",
    description: "Sudah jadi member OLYMPUS selama 3 bulan",
    icon: "🌿",
    category: "LOYALITAS",
    threshold: 90,
    statKey: "membershipDays",
  },
  {
    code: "MEMBER_6_MONTHS",
    name: "6 Bulan Bergabung",
    description: "Sudah jadi member OLYMPUS selama 6 bulan",
    icon: "🌳",
    category: "LOYALITAS",
    threshold: 180,
    statKey: "membershipDays",
  },
  {
    code: "MEMBER_1_YEAR",
    name: "1 Tahun Bergabung",
    description: "Sudah jadi member OLYMPUS selama 1 tahun",
    icon: "🎂",
    category: "LOYALITAS",
    threshold: 365,
    statKey: "membershipDays",
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
  {
    code: "BODYWEIGHT_1X",
    name: "Angkat Berat Badan Sendiri",
    description: "Angkat beban setara atau lebih dari berat badanmu sendiri dalam 1 set",
    icon: "🏋️",
    category: "KEKUATAN",
    threshold: 1,
    statKey: "bodyweightMultiple",
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

// ISO 8601 week key ("2026-W04") so a Mon-Sun training week is grouped
// correctly regardless of which day of the week it starts landing on.
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

export async function computeMemberStats(memberId: string): Promise<MemberStats> {
  const [sets, bodyMetrics, member] = await Promise.all([
    prisma.setEntry.findMany({
      where: { memberId },
      select: { workoutDate: true, exerciseId: true, weight: true, reps: true, isPR: true },
    }),
    prisma.bodyMetric.findMany({
      where: { memberId },
      orderBy: { recordedDate: "asc" },
      select: { weight: true },
    }),
    prisma.user.findUnique({ where: { id: memberId }, select: { createdAt: true } }),
  ]);

  const distinctTrainingDays = new Set(sets.map((s) => s.workoutDate.getTime())).size;
  const distinctExercises = new Set(sets.map((s) => s.exerciseId)).size;
  const totalPRs = sets.filter((s) => s.isPR).length;
  const totalVolumeKg = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  const bodyMetricEntries = bodyMetrics.length;
  const weightLostKg =
    bodyMetricEntries >= 2 ? Math.max(0, bodyMetrics[0].weight - bodyMetrics[bodyMetricEntries - 1].weight) : 0;

  const maxWeightLifted = sets.reduce((max, s) => Math.max(max, s.weight), 0);
  const latestBodyWeight = bodyMetricEntries >= 1 ? bodyMetrics[bodyMetricEntries - 1].weight : 0;
  const bodyweightMultiple = latestBodyWeight > 0 ? maxWeightLifted / latestBodyWeight : 0;

  const membershipDays = member ? Math.floor((Date.now() - member.createdAt.getTime()) / 86400000) : 0;

  const distinctDates = Array.from(new Set(sets.map((s) => s.workoutDate.getTime())));
  const weekCounts = new Map<string, number>();
  for (const ts of distinctDates) {
    const key = isoWeekKey(new Date(ts));
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }
  const maxWeeklyTrainingDays = weekCounts.size > 0 ? Math.max(...weekCounts.values()) : 0;

  return {
    distinctTrainingDays,
    totalPRs,
    totalVolumeKg,
    distinctExercises,
    bodyMetricEntries,
    weightLostKg,
    bodyweightMultiple,
    membershipDays,
    maxWeeklyTrainingDays,
  };
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
//
// markSeen controls whether the new unlocks are stamped as already-seen:
// true (default) for anywhere the member is directly looking at the result
// (their own set/body-metric save, or the achievements page itself) — no
// further notification needed. Pass false when a coach logs on the
// member's behalf, so it surfaces as an unseen notification next time the
// member opens the app instead of unlocking silently.
export async function syncMemberAchievements(
  memberId: string,
  { markSeen = true }: { markSeen?: boolean } = {}
): Promise<Achievement[]> {
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
    data: newlyEarned.map((a) => ({ memberId, achievementCode: a.code, seenAt: markSeen ? new Date() : null })),
    skipDuplicates: true,
  });

  return newlyEarned;
}

// Achievements unlocked (e.g. by a coach logging on the member's behalf)
// that the member hasn't been shown a celebration for yet.
export async function getUnseenAchievements(memberId: string): Promise<Achievement[]> {
  const unseen = await prisma.achievementUnlock.findMany({
    where: { memberId, seenAt: null },
    select: { achievementCode: true },
  });
  if (unseen.length === 0) return [];
  const codes = new Set(unseen.map((u) => u.achievementCode));
  return ACHIEVEMENTS.filter((a) => codes.has(a.code));
}

export async function markAchievementsSeen(memberId: string): Promise<void> {
  await prisma.achievementUnlock.updateMany({
    where: { memberId, seenAt: null },
    data: { seenAt: new Date() },
  });
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
