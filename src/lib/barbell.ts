// Client-safe: barbell movements, the ones a PR celebration shows on the
// class TV ("BB Deadlift", "Barbell Hip Thrust", "Back Squat" with the
// library's equipment set to Barbell, or a classic barbell lift by name).
const BARBELL = /(^|[\s/(])(bb|barbell|olympic\s*bar|ez[\s-]*bar|trap\s*bar|hex\s*bar)\b/i;
// Named for another implement: a "DB Bench Press" is not a barbell lift.
const OTHER_IMPLEMENT = /\b(db|dumbbells?|kb|kettlebells?|cable|machine|smith|band(ed)?|landmine|sandbag|plate|med(icine)?\s*ball|goblet|single[\s-]*(leg|arm)|bodyweight|bw)\b/i;
// Lifts done with a barbell unless the name says otherwise.
const CLASSIC = /\b(back\s*squat|front\s*squat|overhead\s*squat|deadlift|rdl|bench\s*press|overhead\s*press|military\s*press|push\s*press|strict\s*press|clean|snatch|jerk|hip\s*thrust|good\s*morning|pendlay|bent[\s-]*over\s*row)\b/i;

export function isBarbellExercise(name: string, equipment?: string | null): boolean {
  const n = name.trim();
  if (BARBELL.test(n)) return true;
  const eq = (equipment ?? "").trim();
  if (eq) return BARBELL.test(eq);
  return CLASSIC.test(n) && !OTHER_IMPLEMENT.test(n);
}

/** A barbell PR for the class TV celebration. */
export interface PREvent {
  id: string;
  memberName: string;
  exercise: string;
  weight: number;
  reps: number;
  /** kg above the member's previous best on this movement; null on a first lift. */
  delta: number | null;
}
