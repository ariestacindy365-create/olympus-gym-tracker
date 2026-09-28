"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/packages";

export interface RevenueTrendPoint {
  label: string;
  revenue: number;
  expense: number;
}

function formatCompactRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return String(value);
}

export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  return (
    <Card>
      <h2 className="mb-3 font-display text-lg font-semibold">Tren Pendapatan &amp; Pengeluaran</h2>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={formatCompactRupiah} width={48} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value, name) => [formatRupiah(Number(value)), name === "revenue" ? "Pendapatan" : "Pengeluaran"]}
            />
            <Legend
              formatter={(value) => (value === "revenue" ? "Pendapatan" : "Pengeluaran")}
              wrapperStyle={{ fontSize: 12, color: "var(--muted)" }}
            />
            <Bar dataKey="revenue" name="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="expense" fill="var(--danger)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
