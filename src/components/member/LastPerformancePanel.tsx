interface LastSet {
  setNumber: number;
  weight: number;
  reps: number;
  workoutDate: string;
}

export function LastPerformancePanel({ lastSets }: { lastSets: LastSet[] }) {
  if (lastSets.length === 0) {
    return <p className="text-xs text-muted">Belum ada catatan sebelumnya untuk gerakan ini.</p>;
  }

  const date = new Date(lastSets[0].workoutDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span>Terakhir ({date}):</span>
      {lastSets.map((s) => (
        <span key={s.setNumber} className="rounded bg-surface-2 px-2 py-0.5 text-foreground">
          {s.reps} x {s.weight}kg
        </span>
      ))}
    </div>
  );
}
