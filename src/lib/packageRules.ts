// How a bought package becomes a membership: when it starts, when it ends,
// and how it's described. Pure (no database) so the feature guard can check it.

/** "Tidak hangus" packages end far in the future. */
export const NO_EXPIRY_END = "2099-12-31";

export interface PeriodSource {
  durationDays: number | null;
  durationMonths: number | null;
}

/** "YYYY-MM-DD" + n calendar months (31 Jan + 1 → 28/29 Feb). */
export function addMonthsDay(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
}

export function addDaysDay(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Last valid day of a package started on `start`: months (like FitQuarter,
 * 1 Nov → 1 Dec), days (28 → 4 weeks), else it doesn't expire.
 */
export function packageEnd(p: PeriodSource, start: string): string {
  if (p.durationMonths) return addMonthsDay(start, p.durationMonths);
  if (p.durationDays) return addDaysDay(start, p.durationDays);
  return NO_EXPIRY_END;
}

/**
 * When a new package starts: today, except a time-based Bootcamp Unlimited,
 * which waits for the member's current unlimited period to end so buying
 * early never loses days. `currentUnlimitedEnds` is that period's last day.
 */
export function packageStart(kind: string, today: string, currentUnlimitedEnds: string | null): string {
  if (kind === "BOOTCAMP_UNLIMITED" && currentUnlimitedEnds && currentUnlimitedEnds >= today) return addDaysDay(currentUnlimitedEnds, 1);
  return today;
}

/** "1 bulan · unlimited", "8 sesi · berlaku 4 minggu", "4 sesi · tidak hangus". */
export function packageDetail(p: PeriodSource & { credits: number | null }): string {
  const what = p.credits == null ? "unlimited" : `${p.credits} sesi`;
  if (p.durationMonths) return `${p.durationMonths} bulan · ${what}`;
  if (p.durationDays) return `${what} · berlaku ${p.durationDays % 7 === 0 ? `${p.durationDays / 7} minggu` : `${p.durationDays} hari`}`;
  return `${what} · tidak hangus`;
}
