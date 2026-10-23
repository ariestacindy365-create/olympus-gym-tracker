// Units a set can be counted in. Client-safe.
import type { SetUnit } from "@/generated/prisma/enums";

export type { SetUnit };

export const UNIT_LABEL: Record<SetUnit, string> = {
  REPS: "reps",
  SECONDS: "detik",
  LAPS: "lap",
  METERS: "m",
  CALORIES: "kal",
};

/** Highest amount accepted per unit (reps are capped low on purpose). */
export const UNIT_MAX: Record<SetUnit, number> = {
  REPS: 200,
  SECONDS: 3600,
  LAPS: 200,
  METERS: 20000,
  CALORIES: 2000,
};

/** The unit a program target is written in: `30"` / `45 detik` → SECONDS, `1 lap`, `200 m`, `7 kal`; otherwise reps. */
export function unitFromTarget(target: string | null | undefined): SetUnit {
  const t = (target ?? "").trim().toLowerCase();
  if (!t) return "REPS";
  if (/("|”|''|\bdetik\b|\bdtk\b|\bsec(ond)?s?\b|^\d+\s*s$|\d+:\d{2})/.test(t)) return "SECONDS";
  if (/\blaps?\b|\bputaran\b/.test(t)) return "LAPS";
  if (/\b(kal|kkal|cal|cals|kcal)\b/.test(t)) return "CALORIES";
  if (/\d\s*(m|meter|meters|km)\b/.test(t)) return "METERS";
  return "REPS";
}

/** Number to prefill from a target: "12", "10 reps each", "8-10" → 12/10/8; `30"` → 30; "1:30" → 90; "1 km" → 1000. */
export function amountFromTarget(target: string | null | undefined): number | null {
  const t = (target ?? "").trim().toLowerCase();
  const mmss = t.match(/^(\d+):(\d{2})/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const m = t.match(/^(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return /\d\s*km\b/.test(t) ? n * 1000 : n;
}

/** kg moved by a set: only rep sets count toward volume. */
export function setVolume(s: { weight: number; reps: number; unit?: SetUnit | null }) {
  return !s.unit || s.unit === "REPS" ? s.weight * s.reps : 0;
}

/** "12 reps", "30 detik", "2 lap", "200 m", "10 kal". */
export function formatAmount(amount: number, unit: SetUnit | null | undefined) {
  return `${amount} ${UNIT_LABEL[unit ?? "REPS"]}`;
}

/** A set as text: "50 kg × 12", "30 detik", "20 kg · 2 lap". */
export function formatSet(s: { weight: number; reps: number; unit?: SetUnit | null }) {
  const kg = `${s.weight.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg`;
  if (!s.unit || s.unit === "REPS") return `${kg} × ${s.reps}`;
  return s.weight > 0 ? `${kg} · ${formatAmount(s.reps, s.unit)}` : formatAmount(s.reps, s.unit);
}

/** A personal record as text: "60 kg × 8", "~72,5 kg 1RM", "45 detik". */
export function formatRecord(r: { type: string; weight: number; reps: number; unit?: SetUnit | null; estimated1RM: number }) {
  if (r.type === "MAX_1RM") return `~${r.estimated1RM.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg 1RM`;
  return formatSet(r);
}
