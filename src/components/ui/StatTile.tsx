interface StatTileProps {
  label: string;
  value: string | number;
  accent?: boolean;
  danger?: boolean;
}

export function StatTile({ label, value, accent, danger }: StatTileProps) {
  const topBorder = danger ? "border-t-danger" : accent ? "border-t-accent" : "border-t-border";
  return (
    <div className={`rounded-lg border border-t-4 border-border bg-surface p-4 shadow-sm ${topBorder}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1 break-words font-display text-xl font-bold leading-tight sm:text-2xl md:text-3xl ${danger ? "text-danger" : accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
