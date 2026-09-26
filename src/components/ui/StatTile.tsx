interface StatTileProps {
  label: string;
  value: string | number;
  accent?: boolean;
  danger?: boolean;
}

export function StatTile({ label, value, accent, danger }: StatTileProps) {
  const tone = danger ? "text-danger" : accent ? "text-accent" : "text-foreground";
  const bar = danger ? "bg-danger" : accent ? "bg-accent" : "bg-border-strong";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-card">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`tabular mt-1 font-display text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
