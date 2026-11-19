// Pure helpers for the data export (no database), so the feature guard can
// check them. Dates are "YYYY-MM-DD" Jakarta calendar days.

export const EXPORT_SECTIONS = ["member", "keuangan", "lead"] as const;
export type ExportSection = (typeof EXPORT_SECTIONS)[number];

export const EXPORT_SECTION_LABEL: Record<ExportSection, string> = {
  member: "Member & paket",
  keuangan: "Keuangan",
  lead: "Lead & booking kelas",
};

/** The longest period one file covers. */
export const MAX_EXPORT_DAYS = 400;

const isDay = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** "member,keuangan" + from/to → what to export, or an error in Indonesian. */
export function parseExportRequest(
  bagian: string | null,
  dari: string | null,
  sampai: string | null
): { sections: ExportSection[]; from: string; to: string } | { error: string } {
  const sections = [...new Set((bagian ?? "").split(",").map((s) => s.trim()))].filter((s): s is ExportSection =>
    (EXPORT_SECTIONS as readonly string[]).includes(s)
  );
  if (sections.length === 0) return { error: "Pilih data yang mau diekspor." };
  if (!isDay(dari) || !isDay(sampai)) return { error: "Pilih tanggal periode yang valid." };
  if (dari > sampai) return { error: "Tanggal awal harus sebelum tanggal akhir." };
  const days = (Date.parse(`${sampai}T00:00:00Z`) - Date.parse(`${dari}T00:00:00Z`)) / 86_400_000 + 1;
  if (days > MAX_EXPORT_DAYS) return { error: `Periode maksimal ${MAX_EXPORT_DAYS} hari.` };
  return { sections: EXPORT_SECTIONS.filter((s) => sections.includes(s)), from: dari, to: sampai };
}

/** The instants a Jakarta-day period covers: [start, end). */
export function periodBounds(from: string, to: string): { start: Date; end: Date } {
  const start = new Date(Date.parse(`${from}T00:00:00+07:00`));
  const end = new Date(Date.parse(`${to}T00:00:00+07:00`) + 86_400_000);
  return { start, end };
}

/** "2026-11-19 14:05" in Jakarta time (sorts right in Excel). */
export function jakartaStamp(d: Date | null | undefined, withTime = true): string {
  if (!d) return "";
  const j = new Date(d.getTime() + 7 * 3_600_000).toISOString();
  return withTime ? `${j.slice(0, 10)} ${j.slice(11, 16)}` : j.slice(0, 10);
}

/** A date key (UTC midnight of a day) as "YYYY-MM-DD". */
export const dayOfKey = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/** "Olympus-Data-2026-11-01_sd_2026-11-19.xlsx" */
export const exportFileName = (from: string, to: string) => `Olympus-Data-${from}_sd_${to}.xlsx`;
