export function epley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export interface RepWeightRow {
  reps: number;
  weight: number;
  percent: number;
}

const ESTIMATE_REP_TARGETS = [1, 3, 5, 8, 10, 12, 15];

export function repWeightTable(oneRepMax: number): RepWeightRow[] {
  return ESTIMATE_REP_TARGETS.map((reps) => {
    const weight = reps <= 1 ? oneRepMax : oneRepMax / (1 + reps / 30);
    return { reps, weight, percent: oneRepMax > 0 ? (weight / oneRepMax) * 100 : 0 };
  });
}
