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
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";
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

  // Revenue reporting — all from Payment, no new tracking needed.
  const monthStart = startOfMonth(today);
  const [revenueThisMonth, revenueAllTime, paymentsThisMonth] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart } } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.payment.findMany({
      where: { paidAt: { gte: monthStart } },
      select: { amount: true, packageName: true, paymentMethod: true },
    }),
  ]);

  const revenueByPackage = new Map<string, { count: number; total: number }>();
  const revenueByMethod = new Map<string, { count: number; total: number }>();
  for (const p of paymentsThisMonth) {
    const pkg = revenueByPackage.get(p.packageName) ?? { count: 0, total: 0 };
    pkg.count += 1;
    pkg.total += p.amount;
    revenueByPackage.set(p.packageName, pkg);

    const method = revenueByMethod.get(p.paymentMethod) ?? { count: 0, total: 0 };
    method.count += 1;
    method.total += p.amount;
    revenueByMethod.set(p.paymentMethod, method);
  }
  const topPackagesThisMonth = [...revenueByPackage.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  const byMethodThisMonth = [...revenueByMethod.entries()].sort((a, b) => b[1].total - a[1].total);

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
      <h1 className="font-display text-2xl font-bold">Overview Admin</h1>

      {process.env.ADMIN_INVITE_CODE && <AdminInviteCodeCard code={process.env.ADMIN_INVITE_CODE} />}

      <ConversionRateChart
        events={conversionEvents.map((e) => ({
          trialMarkedAt: e.trialMarkedAt?.toISOString() ?? null,
          convertedAt: e.convertedAt?.toISOString() ?? null,
        }))}
      />

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Pendapatan</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Bulan Ini" value={formatRupiah(revenueThisMonth._sum.amount ?? 0)} accent />
          <StatTile label="Sepanjang Waktu" value={formatRupiah(revenueAllTime._sum.amount ?? 0)} />
          <StatTile label="Retention Rate" value={retentionRate != null ? `${retentionRate}%` : "-"} accent />
        </div>
        {paymentsThisMonth.length === 0 ? (
          <p className="text-sm text-muted">Belum ada pembayaran bulan ini.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Paket Terlaris Bulan Ini</p>
              <ul className="flex flex-col gap-1.5">
                {topPackagesThisMonth.map(([name, stat]) => (
                  <li key={name} className="flex items-center justify-between text-sm">
                    <span>
                      {name} <span className="text-xs text-muted">×{stat.count}</span>
                    </span>
                    <span className="font-medium">{formatRupiah(stat.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Metode Bayar Bulan Ini</p>
              <ul className="flex flex-col gap-1.5">
                {byMethodThisMonth.map(([method, stat]) => (
                  <li key={method} className="flex items-center justify-between text-sm">
                    <span>
                      {PAYMENT_METHOD_LABEL[method] ?? method} <span className="text-xs text-muted">×{stat.count}</span>
                    </span>
                    <span className="font-medium">{formatRupiah(stat.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>

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

      {adminStats.map(
        ({ admin, target, capturesToday, followUpsDoneToday, totalTrial, totalConversion, conversionRate, missedFollowUps }) => (
        <Card key={admin.id} className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">{admin.name}</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
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
