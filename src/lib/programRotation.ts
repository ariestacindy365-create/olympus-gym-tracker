// Maps real calendar dates onto a coach's Minggu 1-N rotation (4 weeks unless
// the coach added more, up to 12). A single anchor point ("the week starting
// this Monday is Minggu N") is enough to compute the week number for any
// other date, forever, in both directions — no per-week manual assignment
// needed.

export const DEFAULT_PROGRAM_WEEKS = 4;
export const MAX_PROGRAM_WEEKS = 12;

const WEEKDAY_LABELS = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (d.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

export function weekNumberForDate(date: Date, anchorMonday: Date, anchorWeekNumber: number, weeks = DEFAULT_PROGRAM_WEEKS): number {
  const diffDays = Math.round((mondayOf(date).getTime() - mondayOf(anchorMonday).getTime()) / 86400000);
  const diffWeeks = Math.round(diffDays / 7);
  const zeroBased = (((anchorWeekNumber - 1 + diffWeeks) % weeks) + weeks) % weeks;
  return zeroBased + 1;
}

// The Indonesian day-of-week label a ProgramDay's dayLabel is expected to
// start with (e.g. "SENIN" or "SENIN — UPPER PUSH" both match Monday).
export function weekdayLabelForDate(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()];
}

/** The days a program can be written for, in order (Olympus is closed on Sunday). */
export const PROGRAM_DAYS = WEEKDAY_LABELS.slice(1);

/** The day after the last one written ("+ Tambah hari" after RABU → KAMIS); SENIN after SABTU or when none matches. */
export function nextProgramDay(labels: string[]): string {
  for (let i = labels.length - 1; i >= 0; i--) {
    const at = PROGRAM_DAYS.findIndex((d) => matchesWeekday(labels[i], d));
    if (at >= 0) return PROGRAM_DAYS[(at + 1) % PROGRAM_DAYS.length];
  }
  return PROGRAM_DAYS[0];
}

export function matchesWeekday(dayLabel: string, weekdayLabel: string): boolean {
  return dayLabel.trim().toUpperCase().startsWith(weekdayLabel);
}
