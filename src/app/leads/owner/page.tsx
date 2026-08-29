import { addDays, subMonths, startOfMonth } from "date-fns";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { TargetEditForm } from "@/components/leads/TargetEditForm";
import { ConversionRateChart } from "@/components/leads/ConversionRateChart";
import { AdminInviteCodeCard } from "@/components/leads/AdminInviteCodeCard";
import { toWhatsAppLink } from "@/lib/whatsapp";
import { waWinBackMessage } from "@/lib/waScripts";
import { Role } from "@/generated/prisma/client";

export default async function LeadsOwnerPage() {
  await requireRole("OWNER");

  const today = todayDateKey();
  const tomorrow = addDays(today, 1);

  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, orderBy: { name: "asc" } });

  // Former members who reached MEMBER at some point (convertedAt set) and
  // are now LOST — i.e. flagged "Tidak Perpanjang" on their H21 follow up,
  // not a trial/DM lead that never converted in the first place.
  const churnedMembers = await prisma.lead.findMany({
    where: { status: "LOST", convertedAt: { not: null }, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
      capturedBy: { select: { name: true } },
    },
    take: 30,
  });

  // Only leads that actually went through a trial belong in the trial->
  // conversion chart — a lead marked MEMBER straight from DM (no trial)
  // has no trialMarkedAt and would otherwise inflate the numerator without
  // a matching trial in the same bucket, pushing the rate past 100%.
  const chartRangeStart = startOfMonth(subMonths(today, 11));
  const conversionEvents = await prisma.lead.findMany({
    where: { deletedAt: null, trialMarkedAt: { gte: chartRangeStart } },
    select: { trialMarkedAt: true, convertedAt: true },
  });

  const adminStats = await Promise.all(
    admins.map(async (admin) => {
      const [target, capturesToday, followUpsDoneToday, totalTrial, totalConversion, trialConversionCount] =
        await Promise.all([
          prisma.target.findUnique({ where: { adminId: admin.id } }),
          prisma.lead.count({
            where: { capturedById: admin.id, capturedAt: { gte: today, lt: tomorrow }, deletedAt: null },
          }),
          prisma.followUp.count({ where: { completedById: admin.id, completedAt: { gte: today, lt: tomorrow } } }),
          prisma.lead.count({ where: { capturedById: admin.id, trialMarkedAt: { not: null }, deletedAt: null } }),
          // Headline "how many members" — includes DM->MEMBER direct signups.
          prisma.lead.count({
            where: { capturedById: admin.id, status: { in: ["MEMBER", "RETENSI"] }, deletedAt: null },
          }),
          // Conversion Rate's numerator: only conversions that came from a
          // trial, so a direct signup doesn't distort the trial funnel rate.
          prisma.lead.count({
            where: {
              capturedById: admin.id,
              trialMarkedAt: { not: null },
              status: { in: ["MEMBER", "RETENSI"] },
              deletedAt: null,
            },
          }),
        ]);
      const conversionRate = totalTrial > 0 ? Math.round((trialConversionCount / totalTrial) * 100) : null;
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

      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Member Tidak Perpanjang</h2>
          <p className="text-xs text-muted">Dari hasil follow up H+21 yang ditandai &quot;Tidak Perpanjang&quot;.</p>
        </div>
        {churnedMembers.length === 0 ? (
          <p className="text-sm text-muted">Belum ada member yang tidak perpanjang.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {churnedMembers.map((lead) => {
              const lastPayment = lead.payments[0];
              return (
                <div
                  key={lead.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted">
                      {lead.waNumber}
                      {lastPayment && ` — terakhir ${lastPayment.packageName}`}
                      {lead.capturedBy && ` · capture: ${lead.capturedBy.name}`}
                    </p>
                  </div>
                  <a href={toWhatsAppLink(lead.waNumber, waWinBackMessage(lead.name))} target="_blank" rel="noreferrer">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs">
                      Chat WA
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
