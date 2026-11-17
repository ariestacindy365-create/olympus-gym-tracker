// Reading FitQuarter's "Member List" CSV export. Pure functions (no
// database), so the feature guard can check them.

export type MembershipKind = "BOOTCAMP_UNLIMITED" | "BOOTCAMP_VISIT" | "NO_EXPIRY" | "TRIAL_CLASS" | "FOUNDER" | "PT" | "MANDIRI" | "OTHER";

/** Packages that book bootcamp classes; PT is scheduled by the coach, Mandiri trains alone. */
export const BOOKABLE: ReadonlySet<MembershipKind> = new Set(["BOOTCAMP_UNLIMITED", "BOOTCAMP_VISIT", "NO_EXPIRY", "TRIAL_CLASS", "FOUNDER"]);

export const KIND_LABEL: Record<MembershipKind, string> = {
  BOOTCAMP_UNLIMITED: "Bootcamp unlimited",
  BOOTCAMP_VISIT: "Bootcamp visit",
  NO_EXPIRY: "Paket no Expiry",
  TRIAL_CLASS: "Trial Class",
  FOUNDER: "Founder",
  PT: "Private Training",
  MANDIRI: "Mandiri",
  OTHER: "Lainnya",
};

/** "Bootcamp Class Visit: 10x Bootcamp" → BOOTCAMP_VISIT, … */
export function membershipKind(name: string): MembershipKind {
  const n = name.toLowerCase();
  if (n.startsWith("bootcamp class visit")) return "BOOTCAMP_VISIT";
  if (n.startsWith("bootcamp")) return "BOOTCAMP_UNLIMITED";
  if (n.includes("no expiry")) return "NO_EXPIRY";
  if (n.startsWith("trial class")) return "TRIAL_CLASS";
  if (n.startsWith("founder")) return "FOUNDER";
  if (n.startsWith("private") || n.startsWith("trial pt")) return "PT";
  if (n.startsWith("mandiri")) return "MANDIRI";
  return "OTHER";
}

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

const REQUIRED = ["Member ID", "Name", "Email", "Membership", "Start Date", "End Date", "Quota Used", "Quota Left", "Transaction ID"];

const dateKey = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? new Date(`${v.trim()}T00:00:00Z`) : null);
const count = (v: string) => (/^-?\d+$/.test(v.trim()) ? Number(v.trim()) : null);

export interface FqMember {
  externalId: string;
  name: string;
  email: string;
  phone: string | null;
  birthDate: Date | null;
  joinedAt: Date | null;
}

export interface FqMembership {
  externalId: string;
  sourceRef: string;
  packageName: string;
  kind: MembershipKind;
  canBook: boolean;
  /** null = unlimited */
  credits: number | null;
  creditsUsed: number;
  startsAt: Date;
  expiresAt: Date;
}

export interface FqFile {
  members: FqMember[];
  memberships: FqMembership[];
  /** Rows not imported as a membership: no package, or it already ended. */
  skipped: { noPackage: number; ended: number; badDates: number };
}

/**
 * The export has one row per member × membership. Every member is kept
 * (to link to an app account); a membership only while it's still valid
 * (End Date today or later), with its credits: "Unlimited", or used +
 * left. `today` is "YYYY-MM-DD" in Jakarta.
 */
export function readMemberList(text: string, today: string): FqFile | { error: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "File kosong atau bukan CSV Member List FitQuarter." };
  const head = rows[0].map((h) => h.trim());
  const missing = REQUIRED.filter((h) => !head.includes(h));
  if (missing.length) return { error: `Kolom tidak ditemukan: ${missing.join(", ")}. Pastikan file dari menu Member List FitQuarter.` };
  const col = (r: string[], name: string) => (r[head.indexOf(name)] ?? "").trim();
  const todayKey = new Date(`${today}T00:00:00Z`);

  const members = new Map<string, FqMember>();
  const memberships = new Map<string, FqMembership>();
  const skipped = { noPackage: 0, ended: 0, badDates: 0 };
  for (const r of rows.slice(1)) {
    const externalId = col(r, "Member ID");
    if (!externalId) continue;
    if (!members.has(externalId)) {
      const phone = col(r, "Phone");
      members.set(externalId, {
        externalId,
        name: col(r, "Name"),
        email: col(r, "Email").toLowerCase(),
        phone: phone && phone !== "N/A" ? phone : null,
        birthDate: dateKey(col(r, "Date of Birth")),
        joinedAt: dateKey(col(r, "Joined Date")),
      });
    }
    const packageName = col(r, "Membership");
    const sourceRef = col(r, "Transaction ID");
    if (!packageName || packageName === "N/A" || !sourceRef || sourceRef === "N/A") {
      skipped.noPackage++;
      continue;
    }
    const startsAt = dateKey(col(r, "Start Date"));
    const expiresAt = dateKey(col(r, "End Date"));
    if (!startsAt || !expiresAt) {
      skipped.badDates++;
      continue;
    }
    if (expiresAt < todayKey) {
      skipped.ended++;
      continue;
    }
    const left = col(r, "Quota Left");
    const used = Math.max(0, count(col(r, "Quota Used")) ?? 0);
    const unlimited = left.toLowerCase() === "unlimited";
    const kind = membershipKind(packageName);
    memberships.set(sourceRef, {
      externalId,
      sourceRef,
      packageName,
      kind,
      canBook: BOOKABLE.has(kind),
      credits: unlimited ? null : used + Math.max(0, count(left) ?? 0),
      creditsUsed: unlimited ? 0 : used,
      startsAt,
      expiresAt,
    });
  }
  return { members: [...members.values()], memberships: [...memberships.values()], skipped };
}

/** Credits left, or null for unlimited. */
export const creditsLeft = (m: { credits: number | null; creditsUsed: number }) => (m.credits == null ? null : Math.max(0, m.credits - m.creditsUsed));
