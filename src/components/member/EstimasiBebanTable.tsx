"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { epley1RM, repWeightTable } from "@/lib/oneRepMax";
import { parseWeightInput } from "@/lib/parseWeight";

interface EstimasiBebanTableProps {
  maxWeight: number | null;
  maxEstimated1RM: number | null;
}

function roundToHalf(n: number) {
  return Math.round(n * 2) / 2;
}

export function EstimasiBebanTable({ maxWeight, maxEstimated1RM }: EstimasiBebanTableProps) {
  const [lastWeight, setLastWeight] = useState("");
  const [lastReps, setLastReps] = useState("");

  const recordAnchor = Math.max(maxWeight ?? 0, maxEstimated1RM ?? 0);
  const weightNum = parseWeightInput(lastWeight);
  const repsNum = Number(lastReps);
  const manualAnchor = weightNum && repsNum > 0 ? epley1RM(weightNum, repsNum) : null;
  const anchor1RM = manualAnchor ?? recordAnchor;

  return (
    <Card>
      <h3 className="mb-1 font-display text-lg font-semibold">Estimasi Beban</h3>
      <p className="mb-3 text-xs text-muted">
        Isi beban & reps angkatan terakhirmu untuk hitung persentase dan target berat per reps.
      </p>

      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Beban Terakhir (kg)
          </label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder={recordAnchor > 0 ? String(roundToHalf(recordAnchor)) : "mis. 80"}
            value={lastWeight}
            onChange={(e) => setLastWeight(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Reps</label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="mis. 5"
            value={lastReps}
            onChange={(e) => setLastReps(e.target.value)}
          />
        </div>
      </div>

      {anchor1RM <= 0 ? (
        <p className="text-sm text-muted">
          Belum ada rekor untuk gerakan ini. Catat set pertamamu, atau isi beban & reps di atas.
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted">
            {manualAnchor
              ? `Estimasi 1RM dari input kamu: ${roundToHalf(manualAnchor)}kg.`
              : "Estimasi menyesuaikan angkatan terbaikmu (tak pernah di bawah Personal Best)."}{" "}
            Tinggal pilih jumlah reps target hari ini.
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
