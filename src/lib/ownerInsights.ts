import { addDays, addMonths, format, startOfMonth, subDays, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";

// A membership counts as renewed when the member pays again before, or up
// to this many days after, it expires.
export const RENEWAL_GRACE_DAYS = 30;
const RETENTION_MONTHS = 6;
export const SOURCE_WINDOW_DAYS = 90;

export interface RetentionMonth {
  label: string;
  renewed: number;
  churned: number;
  /** Expired, not renewed yet, but still inside the grace window. */
  pending: number;
  rate: number | null;
}

export interface SourceConversion {
  source: string | null;
  leads: number;
  members: number;
  rate: number;
}

export interface TopProduct {
  name: string;
  units: number;
  revenue: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  threshold: number;
}

/**
 * Renewal rate per month, by the month a membership expired in. Uses each
 * payment's expiresAt snapshot (payments without a known duration are
 * skipped), one entry per lead per month (their last expiry that month).
 */
export async function getRetentionByMonth(): Promise<RetentionMonth[]> {
  const today = todayDateKey();
  const rangeStart = startOfMonth(subMonths(today, RETENTION_MONTHS - 1));
  const payments = await prisma.payment.findMany({
    where: { deletedAt: null, lead: { deletedAt: null }, paidAt: { gte: subMonths(rangeStart, 12) } },
    select: { leadId: true, paidAt: true, expiresAt: true },
    orderBy: { paidAt: "asc" },
  });

  const byLead = new Map<string, typeof payments>();
  for (const p of payments) {
    const list = byLead.get(p.leadId) ?? [];
    list.push(p);
    byLead.set(p.leadId, list);
  }

  const months: RetentionMonth[] = [];
  for (let i = 0; i < RETENTION_MONTHS; i++) {
    const start = addMonths(rangeStart, i);
    const end = addMonths(start, 1);
    let renewed = 0;
    let churned = 0;
    let pending = 0;
    for (const list of byLead.values()) {
      const expiring = list.filter((p) => p.expiresAt && p.expiresAt >= start && p.expiresAt < end).at(-1);
      if (!expiring?.expiresAt) continue;
      const deadline = addDays(expiring.expiresAt, RENEWAL_GRACE_DAYS);
      const renewedPayment = list.some((p) => p.paidAt > expiring.paidAt && p.paidAt <= deadline);
      if (renewedPayment) renewed++;
      else if (deadline > today) pending++;
      else churned++;
    }
    months.push({
      label: format(start, "MMM yy", { locale: idLocale }),
      renewed,
      churned,
      pending,
      rate: renewed + churned > 0 ? Math.round((renewed / (renewed + churned)) * 100) : null,
    });
  }
  return months;
}

/** Leads captured in the last 90 days, by source, and how many became members. */
export async function getSourceConversion(): Promise<SourceConversion[]> {
  const since = subDays(todayDateKey(), SOURCE_WINDOW_DAYS);
  const leads = await prisma.lead.findMany({
    where: { deletedAt: null, capturedAt: { gte: since } },
    select: { source: true, convertedAt: true },
  });
  const map = new Map<string | null, { leads: number; members: number }>();
  for (const l of leads) {
    const row = map.get(l.source) ?? { leads: 0, members: 0 };
    row.leads++;
    if (l.convertedAt) row.members++;
    map.set(l.source, row);
  }
  return [...map.entries()]
    .map(([source, r]) => ({ source, ...r, rate: Math.round((r.members / r.leads) * 100) }))
    .sort((a, b) => (a.source === null ? 1 : b.source === null ? -1 : b.leads - a.leads));
}

export async function getProductInsights(): Promise<{ top: TopProduct[]; lowStock: LowStockProduct[] }> {
  const monthStart = startOfMonth(todayDateKey());
  const [sales, products] = await Promise.all([
    prisma.sale.findMany({
      where: { deletedAt: null, createdAt: { gte: monthStart } },
      select: { productName: true, price: true },
    }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { stock: "asc" } }),
  ]);
  const map = new Map<string, TopProduct>();
  for (const s of sales) {
    const row = map.get(s.productName) ?? { name: s.productName, units: 0, revenue: 0 };
    row.units++;
    row.revenue += s.price;
    map.set(s.productName, row);
  }
  return {
    top: [...map.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 5),
    lowStock: products
      .filter((p) => p.stock <= p.lowStockThreshold)
      .map((p) => ({ id: p.id, name: p.name, stock: p.stock, threshold: p.lowStockThreshold })),
  };
}
