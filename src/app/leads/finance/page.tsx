import Link from "next/link";
import { startOfMonth } from "date-fns";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { formatRupiah, PAYMENT_METHOD_LABEL, EXPENSE_CATEGORY_LABEL } from "@/lib/packages";

export default async function FinancePage() {
  await requireRole("OWNER");

  const today = todayDateKey();
  const monthStart = startOfMonth(today);

  const [
    membershipRevenueThisMonth,
    membershipRevenueAllTime,
    paymentsThisMonth,
    salesRevenueThisMonth,
    salesRevenueAllTime,
    salesThisMonthList,
    expensesThisMonth,
    expensesAllTime,
    expensesThisMonthList,
  ] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart }, deletedAt: null } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { deletedAt: null } }),
    prisma.payment.findMany({
      where: { paidAt: { gte: monthStart }, deletedAt: null },
      select: { amount: true, packageName: true, paymentMethod: true },
    }),
    prisma.sale.aggregate({ _sum: { price: true }, where: { createdAt: { gte: monthStart } } }),
    prisma.sale.aggregate({ _sum: { price: true } }),
    prisma.sale.findMany({ where: { createdAt: { gte: monthStart } }, select: { price: true, productName: true } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart } } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.expense.findMany({ where: { paidAt: { gte: monthStart } }, select: { amount: true, category: true } }),
  ]);

  const revenueThisMonthTotal = (membershipRevenueThisMonth._sum.amount ?? 0) + (salesRevenueThisMonth._sum.price ?? 0);
  const revenueAllTimeTotal = (membershipRevenueAllTime._sum.amount ?? 0) + (salesRevenueAllTime._sum.price ?? 0);

  const salesByProduct = new Map<string, { count: number; total: number }>();
  for (const s of salesThisMonthList) {
    const p = salesByProduct.get(s.productName) ?? { count: 0, total: 0 };
    p.count += 1;
    p.total += s.price;
    salesByProduct.set(s.productName, p);
  }
  const topProductsThisMonth = [...salesByProduct.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);

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

  const expenseByCategory = new Map<string, { count: number; total: number }>();
  for (const e of expensesThisMonthList) {
    const cat = expenseByCategory.get(e.category) ?? { count: 0, total: 0 };
    cat.count += 1;
    cat.total += e.amount;
    expenseByCategory.set(e.category, cat);
  }
  const byCategoryThisMonth = [...expenseByCategory.entries()].sort((a, b) => b[1].total - a[1].total);
  const netProfitThisMonth = revenueThisMonthTotal - (expensesThisMonth._sum.amount ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Keuangan</h1>
        <p className="text-sm text-muted">Rincian pendapatan dan pengeluaran bisnis.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Pendapatan Bulan Ini" value={formatRupiah(revenueThisMonthTotal)} accent />
        <StatTile label="Pendapatan Sepanjang Waktu" value={formatRupiah(revenueAllTimeTotal)} />
        <StatTile
          label="Laba Bersih Bulan Ini"
          value={formatRupiah(netProfitThisMonth)}
          danger={netProfitThisMonth < 0}
          accent={netProfitThisMonth >= 0}
        />
        <StatTile
          label="Pengeluaran Bulan Ini"
          value={formatRupiah(expensesThisMonth._sum.amount ?? 0)}
          danger={(expensesThisMonth._sum.amount ?? 0) > 0}
        />
        <StatTile label="Pengeluaran Sepanjang Waktu" value={formatRupiah(expensesAllTime._sum.amount ?? 0)} />
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Rincian Pemasukan Bulan Ini</h2>
          <Link href="/leads/payments" className="text-xs font-medium text-accent hover:underline">
            Lihat semua riwayat pembayaran →
          </Link>
        </div>
        {paymentsThisMonth.length === 0 ? (
          <p className="text-sm text-muted">Belum ada pembayaran bulan ini.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Paket Terlaris</p>
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
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Metode Bayar</p>
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
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Rincian Penjualan Produk Bulan Ini</h2>
          <Link href="/leads/kasir" className="text-xs font-medium text-accent hover:underline">
            Buka Kasir →
          </Link>
        </div>
        {topProductsThisMonth.length === 0 ? (
          <p className="text-sm text-muted">Belum ada penjualan produk bulan ini.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {topProductsThisMonth.map(([name, stat]) => (
              <li key={name} className="flex items-center justify-between text-sm">
                <span>
                  {name} <span className="text-xs text-muted">×{stat.count}</span>
                </span>
                <span className="font-medium">{formatRupiah(stat.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Rincian Pengeluaran Bulan Ini</h2>
          <Link href="/leads/expenses" className="text-xs font-medium text-accent hover:underline">
            Lihat semua riwayat pengeluaran →
          </Link>
        </div>
        {byCategoryThisMonth.length === 0 ? (
          <p className="text-sm text-muted">Belum ada pengeluaran bulan ini.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {byCategoryThisMonth.map(([category, stat]) => (
              <li key={category} className="flex items-center justify-between text-sm">
                <span>
                  {EXPENSE_CATEGORY_LABEL[category] ?? category} <span className="text-xs text-muted">×{stat.count}</span>
                </span>
                <span className="font-medium">{formatRupiah(stat.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
