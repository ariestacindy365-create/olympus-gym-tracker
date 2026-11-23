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
  // Payments, sales and the like are stamped with the actual time; "kemarin"
  // is the Jakarta calendar day, 00:00–24:00 WIB (UTC+7), not UTC.
  const wib = (d: Date) => new Date(d.getTime() - 7 * 3_600_000);
  const since = wib(yesterday);
  const until = wib(today);

  const [
    capturesYesterday,
    followUpsDoneYesterday,
    paymentsYesterday,
    salesYesterday,
    expensesYesterday,
    followUpsDueToday,
    followUpsOverdue,
    memberships,
    totalChurned,
  ] = await Promise.all([
    prisma.lead.count({ where: { capturedAt: { gte: since, lt: until }, deletedAt: null } }),
    prisma.followUp.count({
      where: { completedAt: { gte: since, lt: until }, lead: { deletedAt: null } },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: since, lt: until }, deletedAt: null },
      select: { amount: true },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: since, lt: until }, deletedAt: null },
      select: { price: true },
    }),
    prisma.expense.findMany({ where: { paidAt: { gte: since, lt: until } }, select: { amount: true } }),
    prisma.followUp.count({
      where: { status: "PENDING", dueDate: { gte: today, lt: addDays(today, 1) }, lead: { deletedAt: null } },
    }),
    prisma.followUp.count({
      where: { status: "PENDING", dueDate: { lt: today }, lead: { deletedAt: null } },
    }),
    // Every package a member holds (app, desk, QRIS/VA, FitQuarter import).
    prisma.membership.findMany({
      select: { userId: true, importedMemberId: true, expiresAt: true, importedMember: { select: { userId: true } } },
    }),
    prisma.lead.count({ where: { status: "LOST", convertedAt: { not: null }, deletedAt: null } }),
  ]);

  // Comparing stock to its own per-row threshold isn't a plain Prisma filter
  // (two-column comparison), so pull active products and filter in JS — fine
  // at this scale (a small snack counter's catalog).
  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { name: true, stock: true, lowStockThreshold: true },
  });
  const lowStockProducts = activeProducts.filter((p) => p.stock <= p.lowStockThreshold);

  const revenueYesterday = paymentsYesterday.reduce((sum, p) => sum + p.amount, 0);
  const salesTotalYesterday = salesYesterday.reduce((sum, s) => sum + s.price, 0);
  const expensesTotalYesterday = expensesYesterday.reduce((sum, e) => sum + e.amount, 0);

  // One person may hold several packages (or an imported record linked to
  // their account): what counts is when their last one ends.
  const lastEnd = new Map<string, Date>();
  for (const m of memberships) {
    const who = m.userId ?? m.importedMember?.userId ?? `imp:${m.importedMemberId}`;
    const prev = lastEnd.get(who);
    if (!prev || m.expiresAt > prev) lastEnd.set(who, m.expiresAt);
  }
  const ends = [...lastEnd.values()];
  const recentCutoff = subDays(today, 30);
  // Ran out in the last 30 days and hasn't bought again.
  const overdueRenewals = ends.filter((e) => e < today && e >= recentCutoff).length;
  const soonRenewals = ends.filter((e) => e >= today && e <= in7Days).length;

  const totalActive = ends.filter((e) => e >= today).length;
  // Retention stays on the lead funnel (members flagged "Tidak Perpanjang").
  const leadMembers = await prisma.lead.count({ where: { status: { in: ["MEMBER", "RETENSI"] }, deletedAt: null } });
  const retentionRate =
    leadMembers + totalChurned > 0 ? Math.round((leadMembers / (leadMembers + totalChurned)) * 100) : null;

  const dateLabel = today.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return [
    `<b>Laporan Harian Olympus</b>`,
    dateLabel,
    ``,
    `<b>Ringkasan Kemarin</b>`,
    `• Lead baru: ${capturesYesterday}`,
    `• Follow up selesai: ${followUpsDoneYesterday}`,
    `• Pembayaran: ${paymentsYesterday.length} transaksi, ${formatRupiah(revenueYesterday)}`,
    `• Penjualan produk: ${salesYesterday.length} transaksi, ${formatRupiah(salesTotalYesterday)}`,
    `• Pengeluaran: ${expensesYesterday.length} transaksi, ${formatRupiah(expensesTotalYesterday)}`,
    ``,
    `<b>Perlu Perhatian Hari Ini</b>`,
    `• Follow up jatuh tempo hari ini: ${followUpsDueToday}`,
    `• Follow up terlambat (belum ditindak): ${followUpsOverdue}`,
    `• Member habis paket (30 hari terakhir, belum perpanjang): ${overdueRenewals}`,
    `• Member akan expired 7 hari lagi: ${soonRenewals}`,
    `• Stok menipis: ${lowStockProducts.length} produk${
      lowStockProducts.length > 0
        ? ` (${lowStockProducts.map((p) => `${p.name}: ${p.stock}`).join(", ")})`
        : ""
    }`,
    ``,
    `<b>Ringkasan Keseluruhan</b>`,
    `• Total member aktif: ${totalActive}`,
    `• Retention rate: ${retentionRate != null ? `${retentionRate}%` : "-"}`,
  ].join("\n");
}
