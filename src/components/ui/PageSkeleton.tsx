// Route-level loading placeholder (used by loading.tsx) so navigation feels
// instant while server data streams in.
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Memuat..." className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 rounded-md bg-border" />
        <div className="h-4 w-72 max-w-full rounded-md bg-border/70" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-surface" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-border bg-surface" />
      <div className="h-40 rounded-xl border border-border bg-surface" />
    </div>
  );
}
