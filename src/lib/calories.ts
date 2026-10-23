// Rough calories burned for a class session. Client-safe.
//
// ACSM formula: kcal/min = MET × 3.5 × body weight (kg) / 200, with MET 5 —
// between the Compendium of Physical Activities' moderate (3.5) and
// vigorous (6) resistance training, since Olympus classes mix lifting with
// EMOM / AMRAP finishers. It's an estimate and is always labelled as one.

const MET = 5;
const DEFAULT_WEIGHT_KG = 65;
// Same cap as the workout duration (2 hours).
const MIN_MINUTES = 10;
const MAX_MINUTES = 120;

export interface CalorieEstimate {
  kcal: number;
  low: number;
  high: number;
  minutes: number;
  weightKg: number;
  /** No weigh-in yet, so DEFAULT_WEIGHT_KG was used. */
  defaultWeight: boolean;
}

export function estimateCalories(durationSec: number, bodyWeightKg: number | null): CalorieEstimate {
  const minutes = Math.round(Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, durationSec / 60)));
  const weightKg = bodyWeightKg && bodyWeightKg > 20 ? bodyWeightKg : DEFAULT_WEIGHT_KG;
  const kcal = ((MET * 3.5 * weightKg) / 200) * minutes;
  const round10 = (n: number) => Math.round(n / 10) * 10;
  return {
    kcal: round10(kcal),
    low: round10(kcal * 0.8),
    high: round10(kcal * 1.2),
    minutes,
    weightKg: Math.round(weightKg * 10) / 10,
    defaultWeight: !(bodyWeightKg && bodyWeightKg > 20),
  };
}
