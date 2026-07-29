import { addDays, subMonths, startOfMonth } from "date-fns";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { TargetEditForm } from "@/components/leads/TargetEditForm";
import { ConversionRateChart } from "@/components/leads/ConversionRateChart";
import { AdminInviteCodeCard } from "@/components/leads/AdminInviteCodeCard";
import { Role } from "@/generated/prisma/client";

export default async function LeadsOwnerPage() {
  await requireRole("OWNER");

  const today = todayDateKey();
  const tomorrow = addDays(today, 1);

  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, orderBy: { name: "asc" } });

  const chartRangeStart = startOfMonth(subMonths(today, 11));
  const conversionEvents = await prisma.lead.findMany({
    where: {
      deletedAt: null,
      OR: [{ trialMarkedAt: { gte: chartRangeStart } }, { convertedAt: { gte: chartRangeStart } }],
    },
    select: { trialMarkedAt: true, convertedAt: true },
  });

  const adminStats = await Promise.all(
    admins.map(async (admin) => {
      const [target, capturesToday, followUpsDoneToday, totalTrial, totalConversion] = await Promise.all([
        prisma.target.findUnique({ where: { adminId: admin.id } }),
        prisma.lead.count({
          where: { capturedById: admin.id, capturedAt: { gte: today, lt: tomorrow }, deletedAt: null },
        }),
        prisma.followUp.count({ where: { completedById: admin.id, completedAt: { gte: today, lt: tomorrow } } }),
        prisma.lead.count({ where: { capturedById: admin.id, trialMarkedAt: { not: null }, deletedAt: null } }),
        prisma.lead.count({
          where: { capturedById: admin.id, status: { in: ["MEMBER", "RETENSI"] }, deletedAt: null },
        }),
      ]);
      const conversionRate = totalTrial > 0 ? Math.round((totalConversion / totalTrial) * 100) : null;
      return { admin, target, capturesToday, followUpsDoneToday, totalTrial, totalConversion, conversionRate };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Overview Admin</h1>

      {process.env.ADMIN_INVITE_CODE && <AdminInviteCodeCard code={process.env.ADMIN_INVITE_CODE} />}

      <ConversionRateChart
        events={conversionEvents.map((e) => ({
          trialMarkedAt: e.trialMarkedAt?.toISOString() ?? null,
          convertedAt: e.convertedAt?.toISOString() ?? null,
        }))}
      />

      {adminStats.map(({ admin, target, capturesToday, followUpsDoneToday, totalTrial, totalConversion, conversionRate }) => (
        <Card key={admin.id} className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">{admin.name}</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <StatTile
              label="Capture Hari Ini"
              value={`${capturesToday}/${target?.targetCapture ?? 0}`}
              accent={capturesToday >= (target?.targetCapture ?? 0)}
            />
            <StatTile
              label="Follow Up Hari Ini"
              value={`${followUpsDoneToday}/${target?.targetFollowup ?? 0}`}
              accent={followUpsDoneToday >= (target?.targetFollowup ?? 0)}
            />
            <StatTile label="Total Trial" value={totalTrial} />
            <StatTile label="Total Conversion" value={totalConversion} />
            <StatTile label="Conversion Rate" value={conversionRate != null ? `${conversionRate}%` : "-"} accent />
          </div>

          <TargetEditForm
            adminId={admin.id}
            targetCapture={target?.targetCapture ?? 5}
            targetFollowup={target?.targetFollowup ?? 10}
          />
        </Card>
      ))}
    </div>
  );
}
