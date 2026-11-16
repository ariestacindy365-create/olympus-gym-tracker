// Client-safe helpers for record sets.

/** One set per movement: the first one seen, so pass the list heaviest first to keep each movement's heaviest. */
export function firstPerExercise<T extends { exerciseId: string }>(sets: T[]): T[] {
  const out = new Map<string, T>();
  for (const s of sets) if (!out.has(s.exerciseId)) out.set(s.exerciseId, s);
  return [...out.values()];
}
