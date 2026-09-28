import Link from "next/link";
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
import { SendDailyReportButton } from "@/components/leads/SendDailyReportButton";
import { toWhatsAppLink } from "@/lib/whatsapp";
import { waWinBackMessage } from "@/lib/waScripts";
import { formatRupiah } from "@/lib/packages";
import { Role } from "@/generated/prisma/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { isStaffEmailAllowed } from "@/lib/staffAccess";
import { todayLabel } from "@/lib/dateLabel";

export default async function LeadsOwnerPage() {
  await requireRole("OWNER");

  const today = todayDateKey();
  const tomorrow = addDays(today, 1);

  const admins = (await prisma.user.findMany({ where: { role: Role.ADMIN }, orderBy: { name: "asc" } })).filter((a) =>
    isStaffEmailAllowed(a.role, a.email)
  );

  // Former members who reached MEMBER at some point (convertedAt set) and
  // are now LOST — i.e. flagged "Tidak Perpanjang" on their H21 follow up,
  // not a trial/DM lead that never converted in the first place.
  const churnedMembers = await prisma.lead.findMany({
    where: { status: "LOST", convertedAt: { not: null }, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      payments: { where: { deletedAt: null }, orderBy: { paidAt: "desc" }, take: 1 },
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

  // Retention rate: of everyone who ever became a member, how many are
  // still active vs. flagged "Tidak Perpanjang". Simple and always
  // available — doesn't depend on package duration being tracked.
  const [activeMemberCount, churnedCount] = await Promise.all([
    prisma.lead.count({ where: { status: { in: ["MEMBER", "RETENSI"] }, deletedAt: null } }),
    prisma.lead.count({ where: { status: "LOST", convertedAt: { not: null }, deletedAt: null } }),
  ]);
  const retentionRate =
    activeMemberCount + churnedCount > 0
      ? Math.round((activeMemberCount / (activeMemberCount + churnedCount)) * 100)
      : null;

  // Just the headline sums here — full breakdown (top packages, payment
  // methods, expense categories) lives on /leads/finance, reached by
  // clicking the Keuangan card below.
  const monthStart = startOfMonth(today);
  const [membershipRevenueThisMonth, salesRevenueThisMonth, expensesThisMonth] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart }, deletedAt: null } }),
    prisma.sale.aggregate({ _sum: { price: true }, where: { createdAt: { gte: monthStart }, deletedAt: null } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart } } }),
  ]);
  const revenueThisMonthTotal = (membershipRevenueThisMonth._sum.amount ?? 0) + (salesRevenueThisMonth._sum.price ?? 0);
  const netProfitThisMonth = revenueThisMonthTotal - (expensesThisMonth._sum.amount ?? 0);

  const adminStats = await Promise.all(
    admins.map(async (admin) => {
      const [target, capturesToday, followUpsDoneToday, totalTrial, totalConversion, trialConversionCount, missedFollowUps] =
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
          // Still-pending follow-ups whose due date has already passed —
          // an accountability signal separate from today's targets.
          prisma.followUp.count({
            where: {
              status: "PENDING",
              dueDate: { lt: today },
              lead: { capturedById: admin.id, deletedAt: null },
            },
          }),
        ]);
      const conversionRate = totalTrial > 0 ? Math.round((trialConversionCount / totalTrial) * 100) : null;
      return { admin, target, capturesToday, followUpsDoneToday, totalTrial, totalConversion, conversionRate, missedFollowUps };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={todayLabel()}
        title="Overview"
        subtitle="Ringkasan keuangan, retensi member, dan performa tim admin."
        actions={<SendDailyReportButton />}
      />

      {process.env.ADMIN_INVITE_CODE && <AdminInviteCodeCard code={process.env.ADMIN_INVITE_CODE} />}

      <ConversionRateChart
        events={conversionEvents.map((e) => ({
          trialMarkedAt: e.trialMarkedAt?.toISOString() ?? null,
          convertedAt: e.convertedAt?.toISOString() ?? null,
        }))}
      />

      <Link href="/leads/finance" className="block">
        <Card className="flex flex-col gap-4 transition hover:border-accent">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Keuangan</h2>
            <span className="text-xs font-medium text-accent">Lihat rincian →</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Pendapatan Bulan Ini" value={formatRupiah(revenueThisMonthTotal)} accent />
            <StatTile
              label="Pengeluaran Bulan Ini"
              value={formatRupiah(expensesThisMonth._sum.amount ?? 0)}
              danger={(expensesThisMonth._sum.amount ?? 0) > 0}
            />
            <StatTile
              label="Laba Bersih Bulan Ini"
              value={formatRupiah(netProfitThisMonth)}
              danger={netProfitThisMonth < 0}
              accent={netProfitThisMonth >= 0}
            />
          </div>
        </Card>
      </Link>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Member Tidak Perpanjang</h2>
            <p className="text-xs text-muted">Dari hasil follow up H+21 yang ditandai &quot;Tidak Perpanjang&quot;.</p>
          </div>
          <StatTile label="Retention Rate" value={retentionRate != null ? `${retentionRate}%` : "-"} accent />
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

      {adminStats.map(
        ({ admin, target, capturesToday, followUpsDoneToday, totalTrial, totalConversion, conversionRate, missedFollowUps }) => (
        <Card key={admin.id} className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">{admin.name}</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            <StatTile
              label="Capture Hari Ini"
              value={`${capturesToday}/${target?.targetCapture ?? 0}`}
              accent={capturesToday >= (target?.targetCapture ?? 0)}
              progress={{ current: capturesToday, target: target?.targetCapture ?? 0 }}
            />
            <StatTile
              label="Follow Up Hari Ini"
              value={`${followUpsDoneToday}/${target?.targetFollowup ?? 0}`}
              accent={followUpsDoneToday >= (target?.targetFollowup ?? 0)}
              progress={{ current: followUpsDoneToday, target: target?.targetFollowup ?? 0 }}
            />
            <StatTile label="Total Trial" value={totalTrial} />
            <StatTile label="Total Conversion" value={totalConversion} />
            <StatTile label="Conversion Rate" value={conversionRate != null ? `${conversionRate}%` : "-"} accent />
            <StatTile label="Follow Up Terlambat" value={missedFollowUps} danger={missedFollowUps > 0} />
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
