// Laba-rugi produk (POS): penjualan − modal, per product and in total.
// Each sale carries the harga modal it was sold at. Sales from before the
// cost was recorded fall back to the product's current harga modal
// (counted as "perkiraan"); with no cost at all they are left out of the
// profit and counted as "modal belum diisi".

export interface ProfitSale {
  productId: string;
  productName: string;
  price: number;
  costPrice: number | null;
}

export interface ProfitRow {
  name: string;
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  /** Sales priced with the product's current cost (no snapshot). */
  estimated: number;
  /** Sales with no cost at all (left out of cost and profit). */
  missing: number;
}

export function productProfit(sales: ProfitSale[], currentCost: Map<string, number | null>) {
  const rows = new Map<string, ProfitRow>();
  for (const s of sales) {
    const row = rows.get(s.productId) ?? { name: s.productName, count: 0, revenue: 0, cost: 0, profit: 0, estimated: 0, missing: 0 };
    row.count += 1;
    row.revenue += s.price;
    let cost = s.costPrice;
    if (cost == null) {
      cost = currentCost.get(s.productId) ?? null;
      if (cost != null) row.estimated += 1;
    }
    if (cost == null) row.missing += 1;
    else {
      row.cost += cost;
      row.profit += s.price - cost;
    }
    rows.set(s.productId, row);
  }
  const list = [...rows.values()].sort((a, b) => b.profit - a.profit || b.revenue - a.revenue);
  const total = list.reduce(
    (t, r) => ({
      count: t.count + r.count,
      revenue: t.revenue + r.revenue,
      cost: t.cost + r.cost,
      profit: t.profit + r.profit,
      estimated: t.estimated + r.estimated,
      missing: t.missing + r.missing,
    }),
    { count: 0, revenue: 0, cost: 0, profit: 0, estimated: 0, missing: 0 }
  );
  return { rows: list, total };
}
