interface StatTileProps {
  label: string;
  value: string | number;
  accent?: boolean;
  danger?: boolean;
  // Shows a bar toward a daily target (e.g. admin capture/follow-up goals).
  progress?: { current: number; target: number };
}

export function StatTile({ label, value, accent, danger, progress }: StatTileProps) {
  const tone = danger ? "text-danger" : accent ? "text-accent" : "text-foreground";
  // Long values (e.g. "Rp 10.600.000") overflow a half-width mobile tile at
  // the default size.
  const size = String(value).length > 9 ? "text-xl sm:text-2xl" : "text-3xl";
  const bar = danger ? "bg-danger" : accent ? "bg-accent" : "bg-border-strong";
  const pct = progress && progress.target > 0 ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : null;
  const done = pct !== null && pct >= 100;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-card">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`tabular mt-1 break-words font-display font-bold leading-tight ${size} ${tone}`}>{value}</p>
      {pct !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label}: ${pct}%`}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
          >
            <div className={`h-full rounded-full transition-all ${done ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`tabular text-xs font-semibold ${done ? "text-success" : "text-muted"}`}>
            {done ? "✓" : `${pct}%`}
          </span>
        </div>
      )}
    </div>
  );
}
