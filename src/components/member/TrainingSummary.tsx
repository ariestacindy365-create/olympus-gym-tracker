import { Card } from "@/components/ui/Card";
import { formatKg } from "@/lib/volumeStory";
import { HEATMAP_WEEKS, type TrainingSummaryData } from "@/lib/trainingSummary";
import { formatSet } from "@/lib/setUnits";

const LEVEL_CLASS = ["bg-surface-2", "bg-accent/25", "bg-accent/50", "bg-accent/75", "bg-accent"];
const DAY_LABELS = ["Sen", "", "Rab", "", "Jum", "", "Min"];

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Quick stats row for the member home page. */
export function TrainingStats({ summary }: { summary: TrainingSummaryData }) {
  const tiles = [
    { label: "Streak", value: `${summary.weekStreak} mgg`, hint: summary.weekStreak > 0 ? "berturut-turut 🔥" : "mulai minggu ini" },
    { label: "Volume minggu ini", value: `${formatKg(summary.volumeThisWeek)} kg`, hint: "total angkatan" },
    { label: "Latihan bulan ini", value: `${summary.daysThisMonth} hari`, hint: "hari berbeda" },
    summary.latestPR
      ? {
          label: "PR terbaru",
          value: formatSet(summary.latestPR),
          hint: `${summary.latestPR.exerciseName} · ${formatShortDate(summary.latestPR.date)}`,
        }
      : { label: "PR terbaru", value: "—", hint: "belum ada" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-border bg-surface p-3 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t.label}</p>
          <p className="tabular mt-0.5 truncate font-display text-xl font-bold">{t.value}</p>
          <p className="truncate text-xs text-muted">{t.hint}</p>
        </div>
      ))}
    </div>
  );
}

/** GitHub-style grid of the last 12 weeks; darker = more volume that day. */
export function TrainingHeatmap({ summary }: { summary: TrainingSummaryData }) {
  const trainedDays = summary.heatmap.flat().filter((d) => d.volume > 0).length;
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Kalender Latihan</h3>
        <span className="text-xs text-muted">
          {trainedDays} hari dalam {HEATMAP_WEEKS} minggu
        </span>
      </div>
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-1 pr-1 text-[10px] text-muted">
          {DAY_LABELS.map((l, i) => (
            <span key={i} className="flex h-full items-center leading-none">
              {l}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: `repeat(${HEATMAP_WEEKS}, minmax(0, 1fr))` }}>
          {summary.heatmap.flat().map((d) => (
            <span
              key={d.date}
              title={d.volume > 0 ? `${d.date}: ${formatKg(d.volume)} kg` : d.date}
              className={`aspect-square rounded-[4px] ${d.future ? "bg-transparent" : LEVEL_CLASS[d.level]}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted">
        Sedikit
        {LEVEL_CLASS.map((c, i) => (
          <span key={i} className={`h-3 w-3 rounded-[3px] ${c}`} />
        ))}
        Banyak
      </div>
    </Card>
  );
}
