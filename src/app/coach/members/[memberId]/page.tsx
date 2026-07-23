import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isOnline, hasLoggedToday } from "@/lib/status";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MemberStatusBadge } from "@/components/coach/MemberStatusBadge";
import { ProgressView, type ExerciseProgress } from "@/components/shared/ProgressView";
import { BodyMetricForm } from "@/components/shared/BodyMetricForm";
import { BodyMetricsView } from "@/components/shared/BodyMetricsView";
import { CoachSetLogger } from "@/components/coach/CoachSetLogger";
import { Role } from "@/generated/prisma/client";

export default async function CoachMemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;

  const member = await prisma.user.findUnique({ where: { id: memberId } });

  if (!member || member.role !== Role.MEMBER) {
    notFound();
  }

  const [setEntries, records, loggedToday, exercises, bodyMetrics] = await Promise.all([
    prisma.setEntry.findMany({
      where: { memberId },
      include: { exercise: true },
      orderBy: [{ workoutDate: "asc" }, { setNumber: "asc" }],
    }),
    prisma.personalRecord.findMany({
      where: { memberId },
      include: { exercise: true },
      orderBy: [{ exercise: { name: "asc" } }, { type: "asc" }],
    }),
    hasLoggedToday(memberId),
    prisma.exercise.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.bodyMetric.findMany({ where: { memberId }, orderBy: { recordedDate: "asc" } }),
  ]);

  const mappedBodyMetrics = bodyMetrics.map((e) => ({
    id: e.id,
    recordedDate: e.recordedDate.toISOString(),
    weight: e.weight,
    bodyFatPercent: e.bodyFatPercent,
    skeletalMuscleMass: e.skeletalMuscleMass,
    visceralFat: e.visceralFat,
    note: e.note,
  }));

  const byExercise = new Map<string, typeof records>();
  for (const record of records) {
    const list = byExercise.get(record.exercise.name) ?? [];
    list.push(record);
    byExercise.set(record.exercise.name, list);
  }

  const progressByExercise = new Map<string, ExerciseProgress>();
  for (const s of setEntries) {
    let entry = progressByExercise.get(s.exerciseId);
    if (!entry) {
      entry = { exerciseId: s.exerciseId, exerciseName: s.exercise.name, sessions: [] };
      progressByExercise.set(s.exerciseId, entry);
    }
    entry.sessions.push({
      id: s.id,
      workoutDate: s.workoutDate.toISOString(),
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      note: s.note,
      isPR: s.isPR,
    });
  }
  const progressExercises = Array.from(progressByExercise.values()).sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{member.name}</h1>
        <p className="text-sm text-muted">{member.email}</p>
        <div className="mt-2 flex items-center gap-2">
          <MemberStatusBadge online={isOnline(member.lastActiveAt)} loggedToday={loggedToday} />
        </div>
      </div>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Personal Records</h2>
        {byExercise.size === 0 ? (
          <p className="text-sm text-muted">No records yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from(byExercise.entries()).map(([exerciseName, recs]) => (
              <div key={exerciseName} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="font-medium">{exerciseName}</span>
                <div className="flex gap-2">
                  {recs.map((r) => (
                    <Badge key={r.id} tone="accent">
                      {r.type === "MAX_WEIGHT" ? `${r.weight}kg x ${r.reps}` : `~${r.estimated1RM.toFixed(1)}kg 1RM`}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CoachSetLogger memberId={memberId} exercises={exercises} />

      <ProgressView
        key={setEntries.length}
        exercises={progressExercises}
        referenceDate={new Date().toISOString()}
        canEdit
        canDelete
        basePath={`/api/coach/members/${memberId}/sets`}
      />

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Body Metrics</h2>
        <div className="flex flex-col gap-4">
          <BodyMetricForm
            basePath={`/api/coach/members/${memberId}/body-metrics`}
            memberName={member.name}
            showDatePicker
          />
          <BodyMetricsView
            key={bodyMetrics.length}
            entries={mappedBodyMetrics}
            canEdit
            canDelete
            basePath={`/api/coach/members/${memberId}/body-metrics`}
          />
        </div>
      </div>
    </div>
  );
}
