// Readings captured per weigh-in. The gym's scale is an Omron Karada Scan;
// form inputs, charts, history columns and "win" detection all come from
// this list, so a scale change only needs edits here (plus the schema).

export type BodyMetricKey =
  | "weight"
  | "bodyFatPercent"
  | "visceralFat"
  | "skeletalMusclePercent"
  | "bodyAge"
  | "skeletalMuscleMass";

export interface BodyMetricField {
  key: BodyMetricKey;
  label: string;
  /** Shown after the value, e.g. "kg", "%". */
  unit: string;
  /** Extra form hint, e.g. "level 1–30". */
  hint?: string;
  /** Which direction counts as progress for the celebration card. */
  better?: "lower" | "higher";
  chartColor: string;
}

export const OMRON_FIELDS: BodyMetricField[] = [
  { key: "weight", label: "Berat Badan", unit: "kg", better: "lower", chartColor: "var(--accent)" },
  { key: "bodyFatPercent", label: "Body Fat", unit: "%", better: "lower", chartColor: "#f59e0b" },
  { key: "visceralFat", label: "Visceral Fat", unit: "", hint: "level 1–30", better: "lower", chartColor: "#f472b6" },
  { key: "skeletalMusclePercent", label: "Otot Rangka", unit: "%", better: "higher", chartColor: "#34d399" },
  { key: "bodyAge", label: "Usia Tubuh", unit: "thn", better: "lower", chartColor: "#fb7185" },
];

// Old InBody readings: no longer entered, only shown where history has them.
export const LEGACY_FIELDS: BodyMetricField[] = [
  { key: "skeletalMuscleMass", label: "Skeletal Muscle (InBody)", unit: "kg", better: "higher", chartColor: "#10b981" },
];

export type BodyMetricValues = { weight: number } & Partial<Record<Exclude<BodyMetricKey, "weight">, number | null>>;

export function formatMetric(field: BodyMetricField, value: number | null | undefined): string {
  if (value == null) return "—";
  if (!field.unit) return `${value}`;
  return field.unit === "%" || field.unit === "kg" ? `${value}${field.unit}` : `${value} ${field.unit}`;
}

/**
 * Prisma write data from validated input. Omron fields left blank are
 * cleared; the legacy InBody column is only touched when sent explicitly,
 * so editing an old entry doesn't wipe its InBody reading.
 */
export function bodyMetricWriteData(input: BodyMetricValues & { note?: string }) {
  return {
    weight: input.weight,
    bodyFatPercent: input.bodyFatPercent ?? null,
    visceralFat: input.visceralFat ?? null,
    skeletalMusclePercent: input.skeletalMusclePercent ?? null,
    bodyAge: input.bodyAge ?? null,
    skeletalMuscleMass: input.skeletalMuscleMass,
    note: input.note ?? null,
  };
}

/** Client-facing shape of one weigh-in (dates as ISO strings). */
export type BodyMetricEntry = {
  id: string;
  recordedDate: string;
  weight: number;
  note: string | null;
} & Record<Exclude<BodyMetricKey, "weight">, number | null>;

export function toBodyMetricEntry(e: {
  id: string;
  recordedDate: Date;
  weight: number;
  bodyFatPercent: number | null;
  visceralFat: number | null;
  skeletalMusclePercent: number | null;
  bodyAge: number | null;
  skeletalMuscleMass: number | null;
  note: string | null;
}): BodyMetricEntry {
  return {
    id: e.id,
    recordedDate: e.recordedDate.toISOString(),
    weight: e.weight,
    bodyFatPercent: e.bodyFatPercent,
    visceralFat: e.visceralFat,
    skeletalMusclePercent: e.skeletalMusclePercent,
    bodyAge: e.bodyAge,
    skeletalMuscleMass: e.skeletalMuscleMass,
    note: e.note,
  };
}
