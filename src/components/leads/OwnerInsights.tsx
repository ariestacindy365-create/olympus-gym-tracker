import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah } from "@/lib/packages";
import { SOURCE_LABEL } from "@/lib/leadStatusLabels";
import {
  RENEWAL_GRACE_DAYS,
  SOURCE_WINDOW_DAYS,
  type LowStockProduct,
  type RetentionMonth,
  type SourceConversion,
  type TopProduct,
} from "@/lib/ownerInsights";

function Bar({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "success" }) {
  const pct = max > 0 ? Math.max(value > 0 ? 4 : 0, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${tone === "success" ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RetentionCard({ months }: { months: RetentionMonth[] }) {
  const hasData = months.some((m) => m.renewed + m.churned + m.pending > 0);
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold">Retensi per Bulan</h2>
        <p className="text-xs text-muted">
          Dari membership yang habis di bulan itu, berapa persen yang perpanjang (maks. {RENEWAL_GRACE_DAYS} hari setelah habis).
        </p>
      </div>
      {!hasData ? (
        <EmptyState title="Belum ada data" description="Butuh pembayaran dengan durasi paket supaya tanggal habisnya diketahui." />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {months.map((m) => (
            <li key={m.label} className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 text-sm">
              <span className="text-muted">{m.label}</span>
              <Bar value={m.rate ?? 0} max={100} tone="success" />
              <span className="tabular flex w-28 flex-col items-end leading-tight">
                <span>
                  <span className="font-semibold">{m.rate != null ? `${m.rate}%` : "–"}</span>
                  <span className="ml-1 text-xs text-muted">
                    {m.renewed}/{m.renewed + m.churned}
                  </span>
                </span>
                {m.pending > 0 && <span className="text-[11px] text-muted">{m.pending} menunggu</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SourceConversionCard({ rows }: { rows: SourceConversion[] }) {
  const maxLeads = Math.max(0, ...rows.map((r) => r.leads));
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold">Konversi per Sumber</h2>
        <p className="text-xs text-muted">Lead {SOURCE_WINDOW_DAYS} hari terakhir menurut asal, dan berapa yang jadi member.</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Belum ada lead" description={`Belum ada lead dalam ${SOURCE_WINDOW_DAYS} hari terakhir.`} />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.source ?? "none"} className="flex flex-col gap-1 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className={r.source ? "font-medium" : "text-muted"}>{r.source ? SOURCE_LABEL[r.source] : "Belum diisi"}</span>
                <span className="tabular text-xs text-muted">
                  {r.leads} lead · {r.members} member · <span className="font-semibold text-foreground">{r.rate}%</span>
                </span>
              </div>
              <Bar value={r.leads} max={maxLeads} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ProductInsightsCard({ top, lowStock }: { top: TopProduct[]; lowStock: LowStockProduct[] }) {
  const maxUnits = Math.max(0, ...top.map((p) => p.units));
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Produk Kasir</h2>
        <Link href="/leads/kasir" className="text-xs font-medium text-accent">
          Buka Kasir →
        </Link>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Terlaris bulan ini</p>
        {top.length === 0 ? (
          <p className="text-sm text-muted">Belum ada penjualan bulan ini.</p>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {top.map((p, i) => (
              <li key={p.name} className="flex flex-col gap-1 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">
                    {i + 1}. {p.name}
                  </span>
                  <span className="tabular shrink-0 text-xs text-muted">
                    {p.units} terjual · {formatRupiah(p.revenue)}
                  </span>
                </div>
                <Bar value={p.units} max={maxUnits} />
              </li>
            ))}
          </ol>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Stok menipis</p>
        {lowStock.length === 0 ? (
          <p className="text-sm text-muted">Semua stok aman.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {lowStock.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{p.name}</span>
                <span className="tabular shrink-0 text-xs font-semibold text-danger">
                  sisa {p.stock} (batas {p.threshold})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
