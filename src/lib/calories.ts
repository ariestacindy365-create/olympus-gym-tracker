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

// Everyday Indonesian food, kcal per usual portion (rounded, typical warung
// sizes), for "setara 1 mangkuk bakso" on the calorie card.
const FOODS = [
  { emoji: "🍘", unit: "keping", name: "kerupuk", kcal: 30 },
  { emoji: "🧋", unit: "gelas", name: "es teh manis", kcal: 90 },
  { emoji: "🍌", unit: "potong", name: "pisang goreng", kcal: 130 },
  { emoji: "🍚", unit: "piring", name: "nasi putih", kcal: 200 },
  { emoji: "☕", unit: "gelas", name: "es kopi susu gula aren", kcal: 220 },
  { emoji: "🥞", unit: "potong", name: "martabak manis", kcal: 250 },
  { emoji: "🍜", unit: "mangkuk", name: "bakso", kcal: 350 },
  { emoji: "🍝", unit: "bungkus", name: "mi instan goreng", kcal: 380 },
  { emoji: "🍳", unit: "piring", name: "nasi goreng", kcal: 550 },
  { emoji: "🍛", unit: "bungkus", name: "nasi padang", kcal: 750 },
] as const;

export interface FoodEquivalent {
  emoji: string;
  /** "1 mangkuk bakso", "2,5 potong pisang goreng" */
  text: string;
}

function portion(kcal: number, f: (typeof FOODS)[number]): FoodEquivalent {
  const n = Math.max(0.5, Math.round((kcal / f.kcal) * 2) / 2);
  return { emoji: f.emoji, text: `${n.toLocaleString("id-ID")} ${f.unit} ${f.name}` };
}

/**
 * The biggest food that fits in `kcal` (about 1×), plus a smaller one at 2×
 * or more for "atau …". The smallest food is used when nothing fits.
 */
export function foodEquivalent(kcal: number): { main: FoodEquivalent; alt: FoodEquivalent | null } {
  const fits = FOODS.filter((f) => f.kcal <= kcal);
  const main = fits[fits.length - 1] ?? FOODS[0];
  const smaller = FOODS.filter((f) => f.kcal < main.kcal && kcal / f.kcal >= 2);
  const alt = smaller[smaller.length - 1];
  return { main: portion(kcal, main), alt: alt ? portion(kcal, alt) : null };
}
