import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OneRepMaxCalculator } from "@/components/shared/OneRepMaxCalculator";
import { PRType } from "@/generated/prisma/client";

export default async function RecordsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const records = await prisma.personalRecord.findMany({
    where: { memberId: user.id },
    include: { exercise: true },
    orderBy: [{ exercise: { name: "asc" } }, { type: "asc" }],
  });

  const byExercise = new Map<string, typeof records>();
  for (const record of records) {
    const list = byExercise.get(record.exercise.name) ?? [];
    list.push(record);
    byExercise.set(record.exercise.name, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Personal Records</h1>
        <p className="text-sm text-muted">Your best lifts, tracked automatically as you log sets.</p>
      </div>

      <Card>
        {byExercise.size === 0 ? (
          <p className="text-muted">No records yet. Log a workout to start setting PRs.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from(byExercise.entries()).map(([exerciseName, recs]) => (
              <div key={exerciseName} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="font-medium">{exerciseName}</span>
                <div className="flex gap-2">
                  {recs.map((r) => (
                    <Badge key={r.id} tone="accent">
                      {r.type === PRType.MAX_WEIGHT
                        ? `${r.weight}kg x ${r.reps}`
                        : `~${r.estimated1RM.toFixed(1)}kg 1RM`}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Kalkulator 1RM</h2>
        <OneRepMaxCalculator />
      </div>
    </div>
  );
}
