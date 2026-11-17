// Class booking rules as pure functions (no database), so the feature
// guard can check them. Dates are "YYYY-MM-DD" (Jakarta calendar days) or
// date keys (UTC midnight of that day); class times are Jakarta wall clock.

import { CLASS_SESSIONS, type ClassSession } from "@/lib/classSessions";

const JAKARTA_OFFSET_MIN = 7 * 60;

export const sessionById = (id: string): ClassSession | null => CLASS_SESSIONS.find((s) => s.id === id) ?? null;

/** When a class starts, as a real instant. */
export function classStart(day: string, session: ClassSession): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, session.startMinute - JAKARTA_OFFSET_MIN));
}

/** When a class ends, as a real instant. */
export function classEnd(day: string, session: ClassSession): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, session.endMinute - JAKARTA_OFFSET_MIN));
}

/** Members can cancel (and get the credit back) until `cancelHours` before the start. */
export const canCancelAt = (now: Date, start: Date, cancelHours: number) => now.getTime() <= start.getTime() - cancelHours * 3_600_000;

/** Weekday of "YYYY-MM-DD", Date.getDay() numbering (0 = Sunday). */
export const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The class days members can book: today and the next `daysAhead - 1` days, without Sundays. */
export function bookableDays(today: string, daysAhead: number): string[] {
  return Array.from({ length: daysAhead }, (_, i) => addDays(today, i)).filter((d) => weekdayOf(d) !== 0);
}

export interface CreditSource {
  id: string;
  canBook: boolean;
  credits: number | null;
  creditsUsed: number;
  /** Date keys or ISO strings. */
  startsAt: Date | string;
  expiresAt: Date | string;
}

const dayOf = (v: Date | string) => (typeof v === "string" ? v : v.toISOString()).slice(0, 10);

/**
 * Which membership pays for a class on `day`: one that books classes, has
 * started and hasn't ended by then, and has a credit left (or is
 * unlimited). The one ending soonest goes first, so credits that expire
 * get used before others.
 */
export function pickMembership<T extends CreditSource>(memberships: T[], day: string): T | null {
  return (
    memberships
      .filter((m) => m.canBook && dayOf(m.startsAt) <= day && dayOf(m.expiresAt) >= day && (m.credits == null || m.creditsUsed < m.credits))
      .sort((a, b) => dayOf(a.expiresAt).localeCompare(dayOf(b.expiresAt)))[0] ?? null
  );
}

export const BOOKING_STATUS_LABEL = {
  BOOKED: "Booked",
  WAITLIST: "Daftar tunggu",
  ATTENDED: "Hadir",
  NO_SHOW: "Tidak hadir",
  CANCELLED: "Dibatalkan",
} as const;

/** Statuses that hold one of the class's places. */
export const TAKES_PLACE = ["BOOKED", "ATTENDED", "NO_SHOW"] as const;

/** "OLY-123456": the code on a member's check-in card. */
export const MEMBER_CODE = /^OLY-\d{6}$/;
