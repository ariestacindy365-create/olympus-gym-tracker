// A round's training scheme, as picked in the program editor and stored
// as plain text on the round's first slot (ProgramSlot.roundScheme):
//   EMOM   → "E3MOM" / "E2,5MOM" (+ the round's set count → "E3MOM (3 set)")
//   AMRAP  → "AMRAP 7 min"
//   TABATA → "TABATA 8 SECTION"
//   FOR TIME → "FOR TIME 12 min" (time cap)
// Anything else is kept as free text ("Lainnya").

export type SchemeKind = "NONE" | "EMOM" | "AMRAP" | "TABATA" | "FOR_TIME" | "CUSTOM";

export interface ParsedScheme {
  kind: SchemeKind;
  /** EMOM interval (minutes), AMRAP length (minutes) or TABATA sections. */
  value: string;
  custom: string;
}

export const SCHEME_KINDS: { id: SchemeKind; label: string }[] = [
  { id: "EMOM", label: "EMOM" },
  { id: "AMRAP", label: "AMRAP" },
  { id: "TABATA", label: "TABATA" },
  { id: "FOR_TIME", label: "FOR TIME" },
  { id: "CUSTOM", label: "Lainnya" },
  { id: "NONE", label: "Tanpa skema" },
];

export const SCHEME_DEFAULTS: Record<SchemeKind, string> = {
  NONE: "",
  EMOM: "3",
  AMRAP: "7",
  TABATA: "8",
  FOR_TIME: "12",
  CUSTOM: "",
};

/** "2,5" or "2.5" → 2.5 (null when not a positive number). */
export function parseMinutes(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 2.5 → "2,5" — decimals are written with a comma, like "2,5 kg" elsewhere. */
export function formatMinutes(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

export function parseScheme(raw: string | null | undefined): ParsedScheme {
  const s = (raw ?? "").trim();
  if (!s) return { kind: "NONE", value: "", custom: "" };
  let m = s.match(/^E(\d+(?:[.,]\d+)?)MOM$/i);
  if (m) return { kind: "EMOM", value: m[1].replace(".", ","), custom: "" };
  if (/^EMOM$/i.test(s)) return { kind: "EMOM", value: "1", custom: "" };
  m = s.match(/^AMRAP\s*(\d+)\s*(min|menit|mins|minutes)?$/i);
  if (m) return { kind: "AMRAP", value: m[1], custom: "" };
  m = s.match(/^TABATA\s*(\d+)\s*(section|sections|sesi)?$/i);
  if (m) return { kind: "TABATA", value: m[1], custom: "" };
  m = s.match(/^FOR\s*TIME(?:\s*(\d+)\s*(min|menit|mins|minutes)?)?$/i);
  if (m) return { kind: "FOR_TIME", value: m[1] ?? "", custom: "" };
  return { kind: "CUSTOM", value: "", custom: s };
}

export function formatScheme(p: ParsedScheme): string {
  const v = p.value.trim();
  switch (p.kind) {
    case "EMOM":
      return `E${(v || SCHEME_DEFAULTS.EMOM).replace(".", ",")}MOM`;
    case "AMRAP":
      return `AMRAP ${v || SCHEME_DEFAULTS.AMRAP} min`;
    case "TABATA":
      return `TABATA ${v || SCHEME_DEFAULTS.TABATA} SECTION`;
    case "FOR_TIME":
      return v ? `FOR TIME ${v} min` : "FOR TIME";
    case "CUSTOM":
      return p.custom.trim();
    default:
      return "";
  }
}

/** Whether the round's set count belongs on the slide ("E3MOM (3 set)"). */
export function schemeUsesSets(kind: SchemeKind): boolean {
  return kind === "EMOM" || kind === "FOR_TIME" || kind === "CUSTOM" || kind === "NONE";
}

/** The line under "Round N" on the slide. */
export function schemeLine(scheme: string | null | undefined, sets: string | number | null | undefined): string {
  const text = (scheme ?? "").trim();
  const n = sets != null ? String(sets).trim() : "";
  const kind = parseScheme(text).kind;
  if (text && n && schemeUsesSets(kind)) return `${text} (${n} set)`;
  if (text) return text;
  return n ? `${n} set` : "";
}
