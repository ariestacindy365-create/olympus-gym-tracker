// Date of birth: stored as a date key (UTC midnight of that calendar day). Client-safe.

export const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Youngest and oldest member age the form accepts. */
export const MIN_AGE = 5;
export const MAX_AGE = 100;

/**
 * "YYYY-MM-DD" → the date key, or an Indonesian error. `today` is the
 * current "YYYY-MM-DD" (Jakarta), so the age check doesn't depend on the
 * server's clock zone.
 */
export function parseBirthDate(value: string, today: string): { date: Date } | { error: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return { error: "Pilih tanggal, bulan, dan tahun lahir." };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return { error: "Tanggal itu tidak ada di kalender." };
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - y;
  if (tm < mo || (tm === mo && td < d)) age--;
  if (value > today) return { error: "Tanggal lahir tidak boleh di masa depan." };
  if (age < MIN_AGE || age > MAX_AGE) return { error: `Periksa lagi tahunnya: umur harus ${MIN_AGE}–${MAX_AGE} tahun.` };
  return { date };
}

/** Days in a month (1–12) of a year, for the day picker. */
export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export { jakartaDateKey as jakartaToday } from "@/lib/jakartaDate";
