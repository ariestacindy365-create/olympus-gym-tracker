// Client-safe PT session rules (no database), shared by the pages and the tests.

/**
 * The session to train on `day`: the one already trained that day, else the
 * first one not trained yet. Training before the coach has written the next
 * session gives null, and nothing is skipped: the next session the coach
 * writes is still the one that comes up.
 */
export function sessionFor<S extends { heldOn: Date | null; slots: unknown[] }>(sessions: S[], day: Date): S | null {
  return (
    sessions.find((s) => s.heldOn?.getTime() === day.getTime()) ??
    sessions.find((s) => !s.heldOn && s.slots.length > 0) ??
    null
  );
}
