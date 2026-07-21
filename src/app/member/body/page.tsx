import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BodyMetricForm } from "@/components/shared/BodyMetricForm";
import { BodyMetricsView } from "@/components/shared/BodyMetricsView";

export default async function MemberBodyPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const entries = await prisma.bodyMetric.findMany({
    where: { memberId: user.id },
    orderBy: { recordedDate: "asc" },
  });

  const mapped = entries.map((e) => ({
    id: e.id,
    recordedDate: e.recordedDate.toISOString(),
    weight: e.weight,
    bodyFatPercent: e.bodyFatPercent,
    skeletalMuscleMass: e.skeletalMuscleMass,
    note: e.note,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Body Metrics</h1>
        <p className="text-sm text-muted">Pantau berat badan, body fat, dan skeletal muscle mass kamu.</p>
      </div>

      <BodyMetricForm basePath="/api/member/body-metrics" memberName={user.name} />

      <BodyMetricsView key={entries.length} entries={mapped} canEdit canDelete basePath="/api/member/body-metrics" />
    </div>
  );
}
