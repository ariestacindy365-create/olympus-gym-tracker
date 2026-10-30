// Client-safe: barbell movements, the ones a PR celebration shows on the
// class TV ("BB Deadlift", "Barbell Hip Thrust", "Back Squat (Barbell)").
const BARBELL = /(^|[\s/(])(bb|barbell)\b/i;

export function isBarbellExercise(name: string): boolean {
  return BARBELL.test(name.trim());
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
