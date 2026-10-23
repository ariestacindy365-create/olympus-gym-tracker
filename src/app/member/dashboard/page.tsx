import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { backfillDays, getTodayDailyWorkout, loggableDateKey, todayDateKey } from "@/lib/workout";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/member/DashboardClient";
import { ProgressView, type ExerciseProgress } from "@/components/shared/ProgressView";
import { UnseenAchievementNotifier } from "@/components/member/UnseenAchievementNotifier";
import { syncMemberAchievements, getUnseenAchievements } from "@/lib/achievements";
import { PageHeader } from "@/components/ui/PageHeader";
import { lifterFromStored, skinToneFromStored } from "@/lib/volumeStory";
import { todayLabel } from "@/lib/dateLabel";
import { CoachNotesCard } from "@/components/member/CoachNotesCard";
import { getCoachNotes } from "@/lib/coachNotes";
import { getThisWeekProgram } from "@/lib/weekProgram";
import { ProgramTodayCard } from "@/components/member/ProgramTodayCard";
import { computeTrainingSummary } from "@/lib/trainingSummary";
import { TrainingHeatmap, TrainingStats } from "@/components/member/TrainingSummary";
import { getTodayPlan } from "@/lib/todayPlan";
import { getMemberClassOn, getMemberTodayClass } from "@/lib/memberClass";
import { BackfillPicker } from "@/components/member/BackfillPicker";
import { getMonthlyChallenge } from "@/lib/challenge";
import { ChallengeCard } from "@/components/member/ChallengeCard";
import { TodayWorkoutPlan, type LoggedSet } from "@/components/member/TodayWorkoutPlan";
import type { SetUnit } from "@/lib/setUnits";

export default async function MemberDashboardPage(props: PageProps<"/member/dashboard">) {
  const user = await getCurrentUser();
  if (!user) return null;

  // ?tgl=YYYY-MM-DD: filling in a workout from one of the last few days.
  const sp = await props.searchParams;
  const tgl = typeof sp.tgl === "string" ? sp.tgl : null;
  const tglKey = tgl ? loggableDateKey(tgl) : null;
  const pastDay = tglKey && tglKey < todayDateKey() ? tglKey : null;
  if (tgl && !pastDay) redirect("/member/dashboard");
  const pickedClass = typeof sp.kelas === "string" ? sp.kelas : null;

  // Membership-duration achievements unlock purely by time passing, not by
  // any set/body-metric action — sync here (unseen, so the celebration
  // still shows) so they're picked up on the page members open most often.
  await syncMemberAchievements(user.id, { markSeen: false });
  const unseenAchievements = await getUnseenAchievements(user.id);

  // Bodyweight sets used to be stored as 0.0001 kg because 0 was rejected;
  // turn this member's old ones into a real 0 (no PR). A no-op once done.
  await prisma.$transaction([
    prisma.setEntry.updateMany({
      where: { memberId: user.id, weight: { gt: 0, lt: 0.01 } },
      data: { weight: 0, estimated1RM: 0, isPR: false },
    }),
    prisma.personalRecord.deleteMany({ where: { memberId: user.id, weight: { gt: 0, lt: 0.01 } } }),
  ]);

  // One query for every set the member has logged; today's sets and each
  // exercise's previous session are derived from it below.
  const todayClass = pastDay ? await getMemberClassOn(user.id, pastDay, pickedClass) : await getMemberTodayClass(user.id);
  const [dailyWorkout, exercises, personalRecords, allSets, coachNotes, weekProgram, todayPlan] = await Promise.all([
    getTodayDailyWorkout(),
    prisma.exercise.findMany({ orderBy: { name: "asc" } }),
    prisma.personalRecord.findMany({ where: { memberId: user.id } }),
    prisma.setEntry.findMany({
      where: { memberId: user.id },
      include: { exercise: true },
      orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
    }),
    getCoachNotes(user.id, 10),
    getThisWeekProgram(todayClass.current?.coach?.id ?? null),
    getTodayPlan(todayClass, pastDay ?? undefined),
  ]);
  const challenge = pastDay ? null : await getMonthlyChallenge(user.id);
  const programToday = pastDay ? null : (weekProgram.days.find((d) => d.isToday) ?? null);
  // The day being logged: today, or the past day being filled in.
  const todayTs = (pastDay ?? todayDateKey()).getTime();
  const backfill = backfillDays().map((date) => ({
    date,
    sets: allSets.filter((s) => s.workoutDate.toISOString().startsWith(date)).length,
  }));
  const dateStr = pastDay ? pastDay.toISOString().slice(0, 10) : null;
  const todaysSets = allSets.filter((s) => s.workoutDate.getTime() === todayTs);

  const todaysSetsMap: Record<
    string,
    { id: string; setNumber: number; weight: number; reps: number; note: string | null; isPR: boolean }[]
  > = {};
  for (const s of todaysSets) {
    (todaysSetsMap[s.exerciseId] ??= []).push({
      id: s.id,
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      note: s.note,
      isPR: s.isPR,
    });
  }

  // allSets is ordered oldest-day-first, so a later day before today simply
  // replaces an exercise's list — what's left is its most recent prior session.
  const lastDateByExercise: Record<string, number> = {};
  const lastSetsMap: Record<string, { setNumber: number; weight: number; reps: number; unit: SetUnit; perSide: boolean; workoutDate: string }[]> = {};
  for (const s of allSets) {
    const ts = s.workoutDate.getTime();
    if (ts >= todayTs) continue;
    if (lastDateByExercise[s.exerciseId] !== ts) {
      lastDateByExercise[s.exerciseId] = ts;
      lastSetsMap[s.exerciseId] = [];
    }
    lastSetsMap[s.exerciseId].push({
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      unit: s.unit,
      perSide: s.perSide,
      workoutDate: s.workoutDate.toISOString(),
    });
  }

  // Heaviest weight per exercise before today: the PR "+N kg" on the
  // Selesai screen is measured against it.
  const priorBestWeights: Record<string, number> = {};
  for (const s of allSets) {
    if (s.workoutDate.getTime() >= todayTs) continue;
    priorBestWeights[s.exerciseId] = Math.max(priorBestWeights[s.exerciseId] ?? 0, s.weight);
  }

  // For the plan's set rows: today's logged sets, and the heaviest weight of
  // the last session as the prefill.
  const planSets: Record<string, LoggedSet[]> = {};
  for (const [id, rows] of Object.entries(todaysSetsMap)) {
    planSets[id] = rows.map(({ id: setId, setNumber, weight, reps, isPR }) => ({ id: setId, setNumber, weight, reps, isPR }));
  }
  const lastWeights: Record<string, number> = {};
  for (const [id, rows] of Object.entries(lastSetsMap)) lastWeights[id] = Math.max(...rows.map((r) => r.weight));

  const personalRecordsByExercise: Record<string, { maxWeight: number | null; maxEstimated1RM: number | null }> = {};
  for (const pr of personalRecords) {
    const entry = (personalRecordsByExercise[pr.exerciseId] ??= { maxWeight: null, maxEstimated1RM: null });
    if (pr.type === "MAX_WEIGHT") entry.maxWeight = pr.weight;
    if (pr.type === "MAX_1RM") entry.maxEstimated1RM = pr.estimated1RM;
  }

  // Collapse to one point per exercise+day using that day's heaviest set
  // (ties broken by higher reps) — every individual set is still stored,
  // this view just charts the day's best like before.
  const bestByDay = new Map<string, (typeof allSets)[number]>();
  for (const s of allSets) {
    const key = `${s.exerciseId}|${s.workoutDate.getTime()}`;
    const existing = bestByDay.get(key);
    if (!existing || s.weight > existing.weight || (s.weight === existing.weight && s.reps > existing.reps)) {
      bestByDay.set(key, s);
    }
  }
  const dayRows = Array.from(bestByDay.values()).sort((a, b) => a.workoutDate.getTime() - b.workoutDate.getTime());

  const byExercise = new Map<string, ExerciseProgress>();
  for (const s of dayRows) {
    let entry = byExercise.get(s.exerciseId);
    if (!entry) {
      entry = { exerciseId: s.exerciseId, exerciseName: s.exercise.name, sessions: [] };
      byExercise.set(s.exerciseId, entry);
    }
    entry.sessions.push({
      id: s.id,
      workoutDate: s.workoutDate.toISOString(),
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      unit: s.unit,
      perSide: s.perSide,
      note: s.note,
      isPR: s.isPR,
    });
  }
  // The chart/table above show one row per day; volume cards and the 1RM
  // trend need every set.
  for (const s of allSets) {
    const entry = byExercise.get(s.exerciseId);
    if (!entry) continue;
    (entry.allSessions ??= []).push({
      id: s.id,
      workoutDate: s.workoutDate.toISOString(),
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      unit: s.unit,
      perSide: s.perSide,
      note: s.note,
      isPR: s.isPR,
    });
  }
  const progressExercises = Array.from(byExercise.values()).sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName)
  );

  const summary = computeTrainingSummary(allSets);

  return (
    <div className="flex flex-col gap-6">
      {pastDay ? (
        <>
          <PageHeader
            eyebrow="Isi latihan yang terlewat"
            title={pastDay.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
            subtitle="Catat set yang kamu lakukan di hari itu, lalu simpan."
          />
          <Link href="/member/dashboard" className="-mt-3 self-start text-sm font-semibold text-accent hover:underline">
            ← Kembali ke latihan hari ini
          </Link>
        </>
      ) : (
        <>
          <PageHeader eyebrow={todayLabel()} title={`Halo, ${user.name}`} subtitle="Berikut latihan hari ini." />
          <TrainingStats summary={summary} />
          <CoachNotesCard notes={coachNotes} />
        </>
      )}

      {todayPlan ? (
        <TodayWorkoutPlan
          key={`${dateStr ?? "today"}-${todayPlan.klass?.sessionId ?? "plan"}`}
          plan={todayPlan}
          todaysSets={planSets}
          lastWeights={lastWeights}
          memberName={user.name}
          storyCharacter={lifterFromStored(user.storyCharacter)}
          storySkinTone={skinToneFromStored(user.storySkinTone)}
          defaultVisibility={user.feedVisibility}
          date={dateStr}
        />
      ) : (
        programToday && <ProgramTodayCard day={programToday} />
      )}

      {dailyWorkout && !todayPlan && !pastDay && (
        <div className="relative overflow-hidden rounded-xl bg-nav-bg p-5 text-nav-foreground shadow-raised [background-image:radial-gradient(28rem_10rem_at_100%_0%,rgb(37_99_235/0.45),transparent)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-nav-muted">🎯 Gerakan hari ini dari pelatih</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-wide text-white">{dailyWorkout.exercise.name}</p>
        </div>
      )}

      {/* The plan above already has every set row; the free-form logger is
          only for days without a class program. */}
      {todayPlan ? null : exercises.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
          Belum ada gerakan yang ditambahkan pelatih. Coba lagi nanti.
        </p>
      ) : (
        <DashboardClient
          exercises={exercises}
          defaultExerciseId={dailyWorkout?.exerciseId ?? null}
          todaysSets={todaysSetsMap}
          lastSets={lastSetsMap}
          personalRecordsByExercise={personalRecordsByExercise}
          memberName={user.name}
          storyCharacter={lifterFromStored(user.storyCharacter)}
          storySkinTone={skinToneFromStored(user.storySkinTone)}
          priorBestWeights={priorBestWeights}
          date={dateStr}
          key={dateStr ?? "today"}
        />
      )}

      <BackfillPicker days={backfill} active={dateStr} />

      {challenge && <ChallengeCard challenge={challenge} compact />}

      {!pastDay && <TrainingHeatmap summary={summary} />}

      {!pastDay && (
        <ProgressView
          exercises={progressExercises}
          referenceDate={new Date().toISOString()}
          canDelete
          shareMemberName={user.name}
          storyCharacter={lifterFromStored(user.storyCharacter)}
          storySkinTone={skinToneFromStored(user.storySkinTone)}
        />
      )}

      <UnseenAchievementNotifier memberName={user.name} badges={unseenAchievements} />
    </div>
  );
}
