// Muscle groups for the Olympus body map. A movement's muscles come from
// its coach-entered primary/secondary muscle when set, otherwise they're
// inferred from the exercise name ("BB Back Squat" → paha depan + bokong).
// Client-safe.

export type MuscleKey =
  | "chest"
  | "delts"
  | "rdelts"
  | "traps"
  | "upback"
  | "lats"
  | "lowback"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "glutes"
  | "quads"
  | "hams"
  | "adductors"
  | "calves";

export const MUSCLE_LABEL: Record<MuscleKey, string> = {
  chest: "Dada",
  delts: "Bahu",
  rdelts: "Bahu belakang",
  traps: "Trapezius",
  upback: "Punggung atas",
  lats: "Sayap (lats)",
  lowback: "Punggung bawah",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Lengan bawah",
  abs: "Perut",
  obliques: "Samping perut",
  glutes: "Bokong",
  quads: "Paha depan",
  hams: "Paha belakang",
  adductors: "Paha dalam",
  calves: "Betis",
};

/** Muscle → weight: 1 = main mover, 0.5 = helper. */
export type MuscleWeights = Partial<Record<MuscleKey, number>>;

// Free-text muscle names (Indonesian or English) → keys, for the coach's
// primaryMuscle / secondaryMuscle fields.
const NAME_TO_KEYS: [RegExp, MuscleKey[]][] = [
  [/dada|chest|pec/i, ["chest"]],
  [/bahu belakang|rear delt|posterior delt/i, ["rdelts"]],
  [/bahu|shoulder|delt/i, ["delts"]],
  [/trap/i, ["traps"]],
  [/punggung bawah|lower back|erector/i, ["lowback"]],
  [/lat|sayap/i, ["lats"]],
  [/punggung|back|rhomboid/i, ["upback", "lats"]],
  [/bicep/i, ["biceps"]],
  [/tricep/i, ["triceps"]],
  [/lengan bawah|forearm|grip/i, ["forearms"]],
  [/oblique|samping perut/i, ["obliques"]],
  [/perut|abs|core|abdom/i, ["abs"]],
  [/bokong|glute|pinggul|hip/i, ["glutes"]],
  [/paha belakang|hamstring/i, ["hams"]],
  [/paha dalam|adductor/i, ["adductors"]],
  [/paha|quad|kaki|leg/i, ["quads"]],
  [/betis|calf|calves/i, ["calves"]],
];

function keysForMuscleName(name: string | null | undefined): MuscleKey[] {
  if (!name?.trim()) return [];
  const out = new Set<MuscleKey>();
  for (const part of name.split(/[,/&+]| dan /i)) {
    for (const [re, keys] of NAME_TO_KEYS) {
      if (re.test(part)) {
        keys.forEach((k) => out.add(k));
        break;
      }
    }
  }
  return [...out];
}

// Exercise-name patterns, checked in order (most specific first).
const RULES: [RegExp, MuscleWeights][] = [
  [/hip thrust|glute bridge|kas glute|bridge|kickback|abduction|crab walk|clam/i, { glutes: 1, hams: 0.5 }],
  [/romanian|rdl|stiff|good ?morning|hamstring|leg curl|nordic/i, { hams: 1, glutes: 1, lowback: 0.5 }],
  [/deadlift|clean|snatch|kettlebell swing|kb swing|swing/i, { hams: 1, glutes: 1, lowback: 1, traps: 0.5 }],
  [/calf|toe walk/i, { calves: 1 }],
  [/lunge|step ?up|split squat|bulgarian|cossack/i, { quads: 1, glutes: 1, adductors: 0.5 }],
  [/squat|leg press|wall sit|thruster/i, { quads: 1, glutes: 1, hams: 0.5, lowback: 0.5 }],
  [/leg extension/i, { quads: 1 }],
  [/adductor|sumo/i, { adductors: 1, glutes: 0.5 }],
  [/face ?pull|rear delt|reverse fly|pull apart/i, { rdelts: 1, upback: 1 }],
  [/shrug/i, { traps: 1 }],
  [/high pull|upright row/i, { traps: 1, delts: 1 }],
  [/pull ?down|pull ?up|chin ?up|lat |hang/i, { lats: 1, biceps: 0.5, forearms: 0.5 }],
  [/row/i, { upback: 1, lats: 1, biceps: 0.5, rdelts: 0.5 }],
  [/curl/i, { biceps: 1, forearms: 0.5 }],
  [/tricep|skull|dip|pushdown|kickback/i, { triceps: 1 }],
  [/lateral raise|front raise|y raise/i, { delts: 1 }],
  [/overhead|shoulder press|military|push press|z press|arnold|plate ground/i, { delts: 1, triceps: 0.5, abs: 0.5 }],
  [/bench|push ?up|chest|fly|press/i, { chest: 1, triceps: 0.5, delts: 0.5 }],
  [/woodchop|russian twist|side plank|oblique/i, { obliques: 1, abs: 0.5 }],
  [/crunch|sit ?up|leg raise|hollow|plank|v-crunch|dead bug|bear|ab /i, { abs: 1, obliques: 0.5 }],
  [/mountain climber/i, { abs: 1, delts: 0.5, quads: 0.5 }],
  [/farmer|carry/i, { forearms: 1, traps: 1, abs: 0.5 }],
  [/burpee|jumping jack|skipping|jump|run|sprint|bike|ski|row erg|shuttle|saq|ball slam|wall ball/i, { quads: 0.5, calves: 0.5, delts: 0.5, abs: 0.5 }],
];

export function musclesFor(name: string, primary?: string | null, secondary?: string | null): MuscleWeights {
  const p = keysForMuscleName(primary);
  if (p.length > 0) {
    const out: MuscleWeights = {};
    p.forEach((k) => (out[k] = 1));
    keysForMuscleName(secondary).forEach((k) => (out[k] ??= 0.5));
    return out;
  }
  for (const [re, weights] of RULES) if (re.test(name)) return weights;
  return {};
}

/** Weighted set count per muscle: main mover counts the full set, helpers half. */
export function muscleLoad(entries: { muscles: MuscleWeights; sets: number }[]): MuscleWeights {
  const load: MuscleWeights = {};
  for (const { muscles, sets } of entries) {
    if (sets <= 0) continue;
    for (const [k, w] of Object.entries(muscles) as [MuscleKey, number][]) load[k] = (load[k] ?? 0) + w * sets;
  }
  return load;
}

/** 0–3 brightness per muscle, relative to the most-trained one. */
export function muscleLevels(load: MuscleWeights): Partial<Record<MuscleKey, number>> {
  const values = Object.values(load).filter((v): v is number => (v ?? 0) > 0);
  const max = Math.max(1, ...values);
  const out: Partial<Record<MuscleKey, number>> = {};
  for (const [k, v] of Object.entries(load) as [MuscleKey, number][]) {
    if (v <= 0) continue;
    const r = v / max;
    out[k] = r > 0.66 ? 3 : r > 0.33 ? 2 : 1;
  }
  return out;
}

export function mainMuscles(m: MuscleWeights): string[] {
  return (Object.entries(m) as [MuscleKey, number][]).filter(([, w]) => w >= 1).map(([k]) => MUSCLE_LABEL[k]);
}
