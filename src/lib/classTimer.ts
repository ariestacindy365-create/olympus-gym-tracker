// Class timer maths (FOR TIME / AMRAP / EMOM / TABATA), kept pure so the
// display just asks "what does the clock show at second X?". A 10-second
// "siap-siap" countdown always runs first.

import { parseScheme } from "@/lib/roundScheme";

export type TimerMode = "FOR_TIME" | "AMRAP" | "EMOM" | "TABATA";

export interface TimerConfig {
  mode: TimerMode;
  /** FOR TIME cap / AMRAP length, in minutes. */
  minutes: number;
  /** EMOM: every N minutes. */
  intervalMin: number;
  /** EMOM sets / TABATA sections. */
  rounds: number;
  /** TABATA work / rest, seconds. */
  workSec: number;
  restSec: number;
}

export const PREP_SEC = 10;

export const TIMER_MODES: { id: TimerMode; label: string }[] = [
  { id: "FOR_TIME", label: "FOR TIME" },
  { id: "AMRAP", label: "AMRAP" },
  { id: "EMOM", label: "EMOM" },
  { id: "TABATA", label: "TABATA" },
];

export const DEFAULT_TIMER: TimerConfig = { mode: "FOR_TIME", minutes: 12, intervalMin: 3, rounds: 3, workSec: 20, restSec: 10 };

const toInt = (v: string | number | null | undefined, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Timer preset for a program round ("E3MOM" + 3 set, "AMRAP 7 min", ...); null when it has no timed scheme. */
export function timerFromScheme(scheme: string | null | undefined, sets: string | number | null | undefined): TimerConfig | null {
  const p = parseScheme(scheme);
  const v = toInt(p.value, 0);
  switch (p.kind) {
    case "EMOM":
      return { ...DEFAULT_TIMER, mode: "EMOM", intervalMin: v || 1, rounds: toInt(sets, 3) };
    case "AMRAP":
      return { ...DEFAULT_TIMER, mode: "AMRAP", minutes: v || 7 };
    case "TABATA":
      return { ...DEFAULT_TIMER, mode: "TABATA", rounds: v || 8 };
    case "FOR_TIME":
      return { ...DEFAULT_TIMER, mode: "FOR_TIME", minutes: v || 12 };
    default:
      return null;
  }
}

/** Seconds of actual work after the prep countdown. */
export function workoutSeconds(c: TimerConfig): number {
  switch (c.mode) {
    case "FOR_TIME":
    case "AMRAP":
      return c.minutes * 60;
    case "EMOM":
      return c.intervalMin * 60 * c.rounds;
    case "TABATA":
      return (c.workSec + c.restSec) * c.rounds - c.restSec;
  }
}

export type TimerPhase = "prep" | "work" | "rest" | "done";

export interface TimerFrame {
  phase: TimerPhase;
  /** What the big clock shows, in seconds. */
  clock: number;
  /** Seconds left in the current phase (drives the 3-2-1 beeps). */
  phaseLeft: number;
  /** 0..1 through the current phase. */
  phaseProgress: number;
  round: number;
  rounds: number;
}

export function frameAt(c: TimerConfig, elapsed: number): TimerFrame {
  const rounds = c.mode === "EMOM" || c.mode === "TABATA" ? c.rounds : 1;
  if (elapsed < PREP_SEC) {
    return { phase: "prep", clock: PREP_SEC - elapsed, phaseLeft: PREP_SEC - elapsed, phaseProgress: elapsed / PREP_SEC, round: 1, rounds };
  }
  const t = elapsed - PREP_SEC;
  const total = workoutSeconds(c);
  if (t >= total) {
    return { phase: "done", clock: c.mode === "FOR_TIME" ? total : 0, phaseLeft: 0, phaseProgress: 1, round: rounds, rounds };
  }
  switch (c.mode) {
    case "FOR_TIME":
      return { phase: "work", clock: t, phaseLeft: total - t, phaseProgress: t / total, round: 1, rounds };
    case "AMRAP":
      return { phase: "work", clock: total - t, phaseLeft: total - t, phaseProgress: t / total, round: 1, rounds };
    case "EMOM": {
      const interval = c.intervalMin * 60;
      const inInterval = t % interval;
      return {
        phase: "work",
        clock: interval - inInterval,
        phaseLeft: interval - inInterval,
        phaseProgress: inInterval / interval,
        round: Math.floor(t / interval) + 1,
        rounds,
      };
    }
    case "TABATA": {
      const cycle = c.workSec + c.restSec;
      const inCycle = t % cycle;
      const round = Math.floor(t / cycle) + 1;
      if (inCycle < c.workSec) {
        return { phase: "work", clock: c.workSec - inCycle, phaseLeft: c.workSec - inCycle, phaseProgress: inCycle / c.workSec, round, rounds };
      }
      const r = inCycle - c.workSec;
      return { phase: "rest", clock: c.restSec - r, phaseLeft: c.restSec - r, phaseProgress: r / c.restSec, round, rounds };
    }
  }
}

/** "mm:ss" with the seconds rounded the way a wall clock would. */
export function formatClock(seconds: number, countDown: boolean): string {
  const s = Math.max(0, countDown ? Math.ceil(seconds - 1e-6) : Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Big label under the scheme: "E3MOM × 3", "AMRAP 7 min", ... */
export function timerTitle(c: TimerConfig): string {
  switch (c.mode) {
    case "FOR_TIME":
      return `FOR TIME · cap ${c.minutes} min`;
    case "AMRAP":
      return `AMRAP ${c.minutes} min`;
    case "EMOM":
      return `E${c.intervalMin}MOM × ${c.rounds} set`;
    case "TABATA":
      return `TABATA ${c.rounds} SECTION · ${c.workSec}/${c.restSec}`;
  }
}
