// Today's date in Jakarta as "YYYY-MM-DD". Client-safe.
//
// Built from formatToParts rather than an "en-CA" formatted string: some
// phone browsers format en-CA as "11/25/2026", which made the year NaN
// (e.g. the birth-year picker showed "NaN").

export function jakartaDateKey(at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const y = get("year");
    const m = get("month");
    const d = get("day");
    if (/^\d{4}$/.test(y) && /^\d{2}$/.test(m) && /^\d{2}$/.test(d)) return `${y}-${m}-${d}`;
  } catch {
    // No time-zone support: fall through to a fixed UTC+7 offset.
  }
  return new Date(at.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}
