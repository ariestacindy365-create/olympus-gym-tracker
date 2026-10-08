import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BodyMetricForm } from "@/components/shared/BodyMetricForm";
import { BodyMetricsView } from "@/components/shared/BodyMetricsView";
import { toBodyMetricEntry } from "@/lib/bodyMetricFields";

export default async function MemberBodyPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const entries = await prisma.bodyMetric.findMany({
    where: { memberId: user.id },
    orderBy: { recordedDate: "asc" },
  });

  const mapped = entries.map(toBodyMetricEntry);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Body Metrics</h1>
        <p className="text-sm text-muted">
          Pantau hasil timbangan Omron Karada Scan kamu: berat, body fat, visceral fat, otot rangka, dan lainnya.
        </p>
      </div>

      <BodyMetricForm basePath="/api/member/body-metrics" memberName={user.name} />

      <BodyMetricsView key={entries.length} entries={mapped} canEdit canDelete basePath="/api/member/body-metrics" />
    </div>
  );
}
