"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { epley1RM } from "@/lib/oneRepMax";

// Standard percentage-of-1RM chart (reps are typical achievable reps at that
// intensity, not derived from the Epley formula).
const PERCENTAGE_TABLE = [
  { pct: 100, reps: 1 },
  { pct: 95, reps: 2 },
  { pct: 90, reps: 4 },
  { pct: 85, reps: 6 },
  { pct: 80, reps: 8 },
  { pct: 75, reps: 10 },
  { pct: 70, reps: 12 },
  { pct: 65, reps: 16 },
  { pct: 60, reps: 20 },
  { pct: 55, reps: 24 },
  { pct: 50, reps: 30 },
];

export function OneRepMaxCalculator() {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const weightNum = Number(weight);
  const repsNum = Number(reps);
  const valid = weightNum > 0 && repsNum > 0;
  const oneRepMax = valid ? epley1RM(weightNum, repsNum) : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Beban (kg)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              placeholder="mis. 80"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Reps</label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="mis. 5"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {oneRepMax != null ? (
        <Card>
          <h2 className="mb-4 font-display text-2xl font-bold">
            1RM kamu: <span className="text-accent">{oneRepMax.toFixed(1)}kg</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3">% 1RM</th>
                  <th className="pb-2 pr-3">Beban</th>
                  <th className="pb-2">Est. Reps</th>
                </tr>
              </thead>
              <tbody>
                {PERCENTAGE_TABLE.map((row) => (
                  <tr key={row.pct} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">{row.pct}%</td>
                    <td className="py-2 pr-3 font-medium">{((oneRepMax * row.pct) / 100).toFixed(1)}kg</td>
                    <td className="py-2 text-muted">{row.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">Isi beban dan reps untuk melihat estimasi 1RM.</p>
        </Card>
      )}
    </div>
  );
}
