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

/** Sessions not trained yet that the coach put on today or a later day, soonest first. */
export function upcomingSchedule<S extends { number: number; title: string | null; heldOn: Date | null; scheduledOn: Date | null; scheduledTime: string | null }>(
  sessions: S[],
  today: Date,
  max = 4
) {
  return sessions
    .filter((s) => !s.heldOn && s.scheduledOn && s.scheduledOn.getTime() >= today.getTime())
    .sort((a, b) => a.scheduledOn!.getTime() - b.scheduledOn!.getTime() || (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""))
    .slice(0, max)
    .map((s) => ({
      number: s.number,
      title: s.title,
      today: s.scheduledOn!.getTime() === today.getTime(),
      label: scheduleLabel(s.scheduledOn!.toISOString().slice(0, 10), s.scheduledTime),
    }));
}

/** Olympus is closed on Sunday, so no session is scheduled then (day: YYYY-MM-DD). */
export function isClosedDay(day: string): boolean {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

/** "Senin, 9 Nov · 07:00" for a session's planned day (YYYY-MM-DD) and time. */
export function scheduleLabel(day: string, time?: string | null): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  return time ? `${date} · ${time}` : date;
}
