// Turns program slots into the "Round 1 / E3MOM (3 set) / A1. ..." layout
// coaches used to retype into Canva. Client-safe (no DB access).

import { schemeLine } from "@/lib/roundScheme";

export interface SlideSlot {
  slotLabel: string | null;
  movementName: string;
  sets: number | string | null;
  repTarget: string | null;
  roundScheme: string | null;
  /** Coach's note on the slot, shown in brackets after the movement name. */
  note?: string | null;
}

export interface SlideRound {
  number: number;
  schemeLine: string;
  /** Raw scheme + set count, for presetting the class timer. */
  scheme: string;
  sets: string;
  items: string[];
}

export interface ProgramSlideData {
  title: string;
  /** e.g. "SENIN" — shown small above the slide in lists, not on the slide. */
  dayLabel: string;
  rounds: SlideRound[];
}

function roundKey(label: string): string {
  const match = label.trim().toUpperCase().match(/^([A-Z]+)/);
  return match ? match[1] : label.trim().toUpperCase() || "_";
}

/** "12" → "12 reps"; anything with words/units ("30\"", "1 lap", "10 reps each") stays as typed. */
export function formatRepTarget(rep: string | null): string {
  const r = (rep ?? "").trim();
  if (!r) return "";
  return /^\d+(\s*[-–]\s*\d+)?$/.test(r) ? `${r} reps` : r;
}

export function buildSlideRounds(slots: SlideSlot[]): SlideRound[] {
  const rounds: { scheme: string; sets: string; items: string[] }[] = [];
  let currentKey: string | null = null;
  for (const s of slots) {
    if (!s.movementName) continue;
    const label = (s.slotLabel ?? "").trim();
    const key: string | null = label ? roundKey(label) : currentKey;
    if (rounds.length === 0 || key !== currentKey) {
      rounds.push({ scheme: (s.roundScheme ?? "").trim(), sets: s.sets != null ? String(s.sets).trim() : "", items: [] });
    }
    currentKey = key;
    const rep = formatRepTarget(s.repTarget);
    const note = (s.note ?? "").trim();
    // "A1. BB Deadlift (tempo 3-1-1) 10-12 reps"
    rounds[rounds.length - 1].items.push(
      `${label ? `${label}. ` : ""}${s.movementName}${note ? ` (${note})` : ""}${rep ? ` ${rep}` : ""}`
    );
  }
  return rounds.map((r, i) => ({
    number: i + 1,
    schemeLine: schemeLine(r.scheme, r.sets),
    scheme: r.scheme,
    sets: r.sets,
    items: r.items,
  }));
}

/** Splits rounds into two columns with the most even content height. */
export function splitIntoColumns(rounds: SlideRound[]): [SlideRound[], SlideRound[]] {
  const weights = rounds.map((r) => 2 + r.items.length);
  const total = weights.reduce((a, b) => a + b, 0);
  let best = rounds.length;
  let bestMax = Infinity;
  let left = 0;
  for (let i = 1; i <= rounds.length; i++) {
    left += weights[i - 1];
    const m = Math.max(left, total - left);
    if (m < bestMax) {
      bestMax = m;
      best = i;
    }
  }
  return [rounds.slice(0, best), rounds.slice(best)];
}
