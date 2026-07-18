interface StatTileProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

export function StatTile({ label, value, accent }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
