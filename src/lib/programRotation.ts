// Maps real calendar dates onto the Minggu 1-4 rotation. A single anchor
// point ("the week starting this Monday is Minggu N") is enough to compute
// the week number for any other date, forever, in both directions — no
// per-week manual assignment needed.

const WEEKDAY_LABELS = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (d.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

export function weekNumberForDate(date: Date, anchorMonday: Date, anchorWeekNumber: number): number {
  const diffDays = Math.round((mondayOf(date).getTime() - mondayOf(anchorMonday).getTime()) / 86400000);
  const diffWeeks = Math.round(diffDays / 7);
  const zeroBased = (((anchorWeekNumber - 1 + diffWeeks) % 4) + 4) % 4;
  return zeroBased + 1;
}

// The Indonesian day-of-week label a ProgramDay's dayLabel is expected to
// start with (e.g. "SENIN" or "SENIN — UPPER PUSH" both match Monday).
export function weekdayLabelForDate(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()];
}

export function matchesWeekday(dayLabel: string, weekdayLabel: string): boolean {
  return dayLabel.trim().toUpperCase().startsWith(weekdayLabel);
}
