import "server-only";
import { addDays, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { formatRupiah } from "@/lib/packages";

// Built fresh from live data every time it's sent — nothing here is
// persisted, so re-sending (e.g. the OWNER's manual "Kirim Sekarang"
// button) always reflects the current state, not a cached snapshot.
export async function buildDailyReportMessage(): Promise<string> {
  const today = todayDateKey();
  const yesterday = subDays(today, 1);
  const in7Days = addDays(today, 7);

  const [
    capturesYesterday,
    followUpsDoneYesterday,
    paymentsYesterday,
    followUpsDueToday,
    followUpsOverdue,
    activeMembers,
    totalChurned,
  ] = await Promise.all([
    prisma.lead.count({ where: { capturedAt: { gte: yesterday, lt: today }, deletedAt: null } }),
    prisma.followUp.count({ where: { completedAt: { gte: yesterday, lt: today } } }),
    prisma.payment.findMany({ where: { paidAt: { gte: yesterday, lt: today } }, select: { amount: true } }),
    prisma.followUp.count({
      where: { status: "PENDING", dueDate: { gte: today, lt: addDays(today, 1) }, lead: { deletedAt: null } },
    }),
    prisma.followUp.count({
      where: { status: "PENDING", dueDate: { lt: today }, lead: { deletedAt: null } },
    }),
    prisma.lead.findMany({
      where: { status: { in: ["MEMBER", "RETENSI"] }, deletedAt: null },
      select: { payments: { orderBy: { paidAt: "desc" }, take: 1, select: { expiresAt: true } } },
    }),
    prisma.lead.count({ where: { status: "LOST", convertedAt: { not: null }, deletedAt: null } }),
  ]);

  const revenueYesterday = paymentsYesterday.reduce((sum, p) => sum + p.amount, 0);

  const overdueRenewals = activeMembers.filter((l) => {
    const expiresAt = l.payments[0]?.expiresAt;
    return expiresAt && expiresAt < today;
  }).length;
  const soonRenewals = activeMembers.filter((l) => {
    const expiresAt = l.payments[0]?.expiresAt;
    return expiresAt && expiresAt >= today && expiresAt <= in7Days;
  }).length;

  const totalActive = activeMembers.length;
  const retentionRate =
    totalActive + totalChurned > 0 ? Math.round((totalActive / (totalActive + totalChurned)) * 100) : null;

  const dateLabel = today.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return [
    `<b>Laporan Harian Olympus</b>`,
    dateLabel,
    ``,
    `<b>Ringkasan Kemarin</b>`,
    `• Lead baru: ${capturesYesterday}`,
    `• Follow up selesai: ${followUpsDoneYesterday}`,
    `• Pembayaran: ${paymentsYesterday.length} transaksi, ${formatRupiah(revenueYesterday)}`,
    ``,
    `<b>Perlu Perhatian Hari Ini</b>`,
    `• Follow up jatuh tempo hari ini: ${followUpsDueToday}`,
    `• Follow up terlambat (belum ditindak): ${followUpsOverdue}`,
    `• Member lewat masa aktif: ${overdueRenewals}`,
    `• Member akan expired 7 hari lagi: ${soonRenewals}`,
    ``,
    `<b>Ringkasan Keseluruhan</b>`,
    `• Total member aktif: ${totalActive}`,
    `• Retention rate: ${retentionRate != null ? `${retentionRate}%` : "-"}`,
  ].join("\n");
}
