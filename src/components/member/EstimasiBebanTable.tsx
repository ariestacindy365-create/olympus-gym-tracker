import { Card } from "@/components/ui/Card";
import { repWeightTable } from "@/lib/oneRepMax";

interface EstimasiBebanTableProps {
  maxWeight: number | null;
  maxEstimated1RM: number | null;
}

function roundToHalf(n: number) {
  return Math.round(n * 2) / 2;
}

export function EstimasiBebanTable({ maxWeight, maxEstimated1RM }: EstimasiBebanTableProps) {
  const anchor1RM = Math.max(maxWeight ?? 0, maxEstimated1RM ?? 0);

  return (
    <Card>
      <h3 className="mb-1 font-display text-lg font-semibold">Estimasi Beban</h3>
      {anchor1RM <= 0 ? (
        <p className="text-sm text-muted">Belum ada rekor untuk gerakan ini. Catat set pertamamu dulu!</p>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted">
            Estimasi menyesuaikan angkatan terbaikmu (tak pernah di bawah Personal Best). Tinggal pilih jumlah reps
            target hari ini.
          </p>
          <div className="flex flex-col gap-1.5">
            {repWeightTable(anchor1RM).map((row) => (
              <div
                key={row.reps}
                className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2"
              >
                <span className="text-sm text-muted">{row.reps} reps</span>
                <span className="flex items-baseline gap-2">
                  <span className="text-xs text-muted">{Math.round(row.percent)}%</span>
                  <span className="font-display text-base font-bold text-accent">{roundToHalf(row.weight)}kg</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
