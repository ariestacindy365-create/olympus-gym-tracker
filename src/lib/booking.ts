import "server-only";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { lockForWrite } from "@/lib/writeLock";
import { CLASS_SESSIONS } from "@/lib/classSessions";
import { getClassSchedule } from "@/lib/classSchedule";
import { jakartaToday } from "@/lib/birthDate";
import { notifyUsers } from "@/lib/notify";
import {
  MEMBER_CODE,
  TAKES_PLACE,
  bookableDays,
  canCancelAt,
  classEnd,
  classStart,
  pickMembership,
  sessionById,
  weekdayOf,
} from "@/lib/bookingRules";
import type { BookingStatus, Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

const dateKey = (day: string) => new Date(`${day}T00:00:00Z`);
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export class BookingError extends Error {}

export async function getBookingSettings() {
  return (await prisma.bookingSettings.findUnique({ where: { id: "default" } })) ?? { id: "default", quota: 12, cancelHours: 2, daysAhead: 7, updatedAt: new Date(0) };
}

/** The member's check-in code, made the first time it's needed. */
export async function ensureMemberCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { memberCode: true } });
  if (user?.memberCode) return user.memberCode;
  for (let i = 0; i < 8; i++) {
    const code = `OLY-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    try {
      const { count } = await prisma.user.updateMany({ where: { id: userId, memberCode: null }, data: { memberCode: code } });
      // 0: a parallel request set it first.
      if (count === 0) return (await prisma.user.findUnique({ where: { id: userId }, select: { memberCode: true } }))!.memberCode!;
      return code;
    } catch (error) {
      // P2002: another member has this code; try another.
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  throw new Error("Could not make a member code");
}

async function placesTaken(tx: Tx, day: string, sessionId: string) {
  return tx.classBooking.count({ where: { classDate: dateKey(day), sessionId, status: { in: [...TAKES_PLACE] } } });
}

/** Whether the member already has a class that day paid by an unlimited package (1 class a day). */
async function unlimitedUsedOn(tx: Tx, userId: string, day: string) {
  return (await tx.classBooking.count({ where: { userId, classDate: dateKey(day), status: { in: [...TAKES_PLACE] }, membership: { credits: null } } })) > 0;
}

async function creditSource(tx: Tx, userId: string, day: string) {
  const memberships = await tx.membership.findMany({ where: { userId, canBook: true, expiresAt: { gte: dateKey(day) } } });
  return pickMembership(memberships, day, { unlimitedUsedToday: await unlimitedUsedOn(tx, userId, day) });
}

async function takeCredit(tx: Tx, userId: string, day: string) {
  const m = await creditSource(tx, userId, day);
  if (!m) return null;
  await tx.membership.update({ where: { id: m.id }, data: { creditsUsed: { increment: 1 } } });
  return m.id;
}

async function returnCredit(tx: Tx, membershipId: string | null) {
  if (!membershipId) return;
  await tx.membership.updateMany({ where: { id: membershipId, creditsUsed: { gt: 0 } }, data: { creditsUsed: { decrement: 1 } } });
}

/** Moves members up from the waiting list while there are places, oldest first. Returns who moved up. */
async function promoteWaitlist(tx: Tx, day: string, sessionId: string, quota: number): Promise<string[]> {
  const moved: string[] = [];
  const waiting = await tx.classBooking.findMany({ where: { classDate: dateKey(day), sessionId, status: "WAITLIST" }, orderBy: { createdAt: "asc" } });
  let taken = await placesTaken(tx, day, sessionId);
  for (const w of waiting) {
    if (taken >= quota) break;
    const membershipId = await takeCredit(tx, w.userId, day);
    if (!membershipId) continue;
    await tx.classBooking.update({ where: { id: w.id }, data: { status: "BOOKED", membershipId } });
    moved.push(w.userId);
    taken++;
  }
  return moved;
}

async function notifyPromoted(userIds: string[], day: string, sessionId: string) {
  if (!userIds.length) return;
  const s = sessionById(sessionId);
  const when = `${new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })} · ${s?.name ?? ""}`;
  await notifyUsers(userIds, { type: "ANNOUNCEMENT", title: "Dapat tempat di kelas!", body: `Kamu naik dari daftar tunggu: ${when}. 1 kredit terpakai.`, url: "/member/booking" }).catch(() => {});
}

/**
 * A member books a class (or an admin adds them at the desk). Full class →
 * waiting list. Members need a membership that books classes with a credit
 * left; admins can add without one. Returns the new status.
 */
export async function bookClass(opts: { userId: string; day: unknown; sessionId: unknown; addedById?: string; now?: Date }): Promise<BookingStatus> {
  const { userId, addedById } = opts;
  const now = opts.now ?? new Date();
  if (!isDay(opts.day) || typeof opts.sessionId !== "string") throw new BookingError("Pilih kelas yang valid.");
  const day = opts.day;
  const session = sessionById(opts.sessionId);
  if (!session || weekdayOf(day) === 0) throw new BookingError("Kelas tidak ditemukan.");
  const settings = await getBookingSettings();
  if (!addedById) {
    if (!bookableDays(jakartaToday(), settings.daysAhead).includes(day)) throw new BookingError(`Booking hanya untuk ${settings.daysAhead} hari ke depan.`);
    if (now >= classStart(day, session)) throw new BookingError("Kelas ini sudah mulai.");
  }
  return prisma.$transaction(async (tx) => {
    await lockForWrite(tx);
    const existing = await tx.classBooking.findUnique({ where: { userId_classDate_sessionId: { userId, classDate: dateKey(day), sessionId: session.id } } });
    if (existing && existing.status !== "CANCELLED") throw new BookingError(existing.status === "WAITLIST" ? "Kamu sudah di daftar tunggu kelas ini." : "Kamu sudah booking kelas ini.");
    const full = (await placesTaken(tx, day, session.id)) >= settings.quota;
    let status: BookingStatus;
    let membershipId: string | null = null;
    const noCredit = async () =>
      new BookingError(
        (await unlimitedUsedOn(tx, userId, day)) ? "Paket unlimited hanya untuk 1 kelas per hari." : "Belum ada membership dengan sisa kredit untuk kelas ini."
      );
    if (full && !addedById) {
      if (!(await creditSource(tx, userId, day))) throw await noCredit();
      status = "WAITLIST";
    } else {
      membershipId = await takeCredit(tx, userId, day);
      if (!membershipId && !addedById) throw await noCredit();
      status = addedById && now >= classStart(day, session) ? "ATTENDED" : "BOOKED";
    }
    const data = { status, membershipId, addedById: addedById ?? null, checkedInAt: status === "ATTENDED" ? now : null, createdAt: now };
    if (existing) await tx.classBooking.update({ where: { id: existing.id }, data });
    else await tx.classBooking.create({ data: { userId, classDate: dateKey(day), sessionId: session.id, ...data } });
    return status;
  });
}

/** A member cancels: until `cancelHours` before the class (credit back), or leaves the waiting list anytime. */
export async function cancelBooking(opts: { userId: string; bookingId: string; now?: Date }) {
  const now = opts.now ?? new Date();
  const settings = await getBookingSettings();
  const result = await prisma.$transaction(async (tx) => {
    await lockForWrite(tx);
    const b = await tx.classBooking.findUnique({ where: { id: opts.bookingId } });
    if (!b || b.userId !== opts.userId || (b.status !== "BOOKED" && b.status !== "WAITLIST")) throw new BookingError("Booking tidak ditemukan.");
    const day = b.classDate.toISOString().slice(0, 10);
    const session = sessionById(b.sessionId)!;
    if (b.status === "BOOKED" && !canCancelAt(now, classStart(day, session), settings.cancelHours)) {
      throw new BookingError(`Pembatalan hanya sampai ${settings.cancelHours} jam sebelum kelas. Hubungi admin.`);
    }
    await tx.classBooking.update({ where: { id: b.id }, data: { status: "CANCELLED", membershipId: null } });
    await returnCredit(tx, b.membershipId);
    return { day, sessionId: b.sessionId, moved: b.status === "BOOKED" ? await promoteWaitlist(tx, day, b.sessionId, settings.quota) : [] };
  });
  await notifyPromoted(result.moved, result.day, result.sessionId);
}

/**
 * Admin at the desk: Hadir, Tidak hadir (credit stays used), or Hapus
 * (removed, credit back, next on the waiting list moves up).
 */
export async function setBookingStatus(opts: { bookingId: string; action: "ATTENDED" | "NO_SHOW" | "REMOVE"; now?: Date }) {
  const now = opts.now ?? new Date();
  const settings = await getBookingSettings();
  const result = await prisma.$transaction(async (tx) => {
    await lockForWrite(tx);
    const b = await tx.classBooking.findUnique({ where: { id: opts.bookingId } });
    if (!b || b.status === "CANCELLED") throw new BookingError("Booking tidak ditemukan.");
    const day = b.classDate.toISOString().slice(0, 10);
    if (opts.action === "REMOVE") {
      await tx.classBooking.update({ where: { id: b.id }, data: { status: "CANCELLED", membershipId: null, checkedInAt: null } });
      await returnCredit(tx, b.membershipId);
      return { day, sessionId: b.sessionId, moved: b.status === "WAITLIST" ? [] : await promoteWaitlist(tx, day, b.sessionId, settings.quota) };
    }
    // From the waiting list straight to present / absent: they take a credit now.
    const membershipId = b.status === "WAITLIST" ? await takeCredit(tx, b.userId, day) : b.membershipId;
    await tx.classBooking.update({
      where: { id: b.id },
      data: { status: opts.action, membershipId, checkedInAt: opts.action === "ATTENDED" ? (b.checkedInAt ?? now) : null },
    });
    return { day, sessionId: b.sessionId, moved: [] as string[] };
  });
  await notifyPromoted(result.moved, result.day, result.sessionId);
}

export interface CheckInResult {
  member: { id: string; name: string };
  /** The class they were checked in to, or null when they have no booking today. */
  sessionId: string | null;
  already?: boolean;
  /** Today's class to suggest adding them to (running now, else next). */
  suggest?: string | null;
}

/** Scanning a member's card at the desk: checks them in to today's booked class nearest to now. */
export async function checkInByCode(code: string, now = new Date()): Promise<CheckInResult> {
  const clean = code.trim().toUpperCase();
  if (!MEMBER_CODE.test(clean)) throw new BookingError("Kode member tidak dikenali.");
  const user = await prisma.user.findUnique({ where: { memberCode: clean }, select: { id: true, name: true } });
  if (!user) throw new BookingError("Kode member tidak terdaftar.");
  const today = jakartaToday();
  const bookings = await prisma.classBooking.findMany({
    where: { userId: user.id, classDate: dateKey(today), status: { in: ["BOOKED", "WAITLIST", "ATTENDED"] } },
  });
  const t = now.getTime();
  // Nearest class: one running now, else the next to start, else the last that ended.
  const ranked = bookings
    .map((b) => {
      const s = sessionById(b.sessionId)!;
      const start = classStart(today, s).getTime();
      const end = classEnd(today, s).getTime();
      return { b, score: t >= start - 90 * 60_000 && t < end ? 0 : start > t ? 1 + (start - t) / 1e9 : 3 + (t - end) / 1e9 };
    })
    .sort((a, b) => a.score - b.score);
  const suggest = CLASS_SESSIONS.find((s) => t < classEnd(today, s).getTime())?.id ?? null;
  if (!ranked.length) return { member: user, sessionId: null, suggest: weekdayOf(today) === 0 ? null : suggest };
  const target = ranked[0].b;
  if (target.status === "ATTENDED") return { member: user, sessionId: target.sessionId, already: true };
  await setBookingStatus({ bookingId: target.id, action: "ATTENDED", now });
  return { member: user, sessionId: target.sessionId };
}

export interface ClassListEntry {
  sessionId: string;
  name: string;
  coach: string | null;
  booked: number;
  waitlist: number;
  attended: number;
}

/** A day's classes with their numbers, for the member and admin lists. */
export async function classesOn(day: string): Promise<ClassListEntry[]> {
  if (weekdayOf(day) === 0) return [];
  const [schedule, rows] = await Promise.all([
    getClassSchedule(),
    prisma.classBooking.groupBy({ by: ["sessionId", "status"], where: { classDate: dateKey(day) }, _count: { _all: true } }),
  ]);
  const n = (sessionId: string, statuses: string[]) => rows.filter((r) => r.sessionId === sessionId && statuses.includes(r.status)).reduce((a, r) => a + r._count._all, 0);
  return CLASS_SESSIONS.map((s) => ({
    sessionId: s.id,
    name: s.name,
    coach: schedule.find((e) => e.weekday === weekdayOf(day) && e.sessionId === s.id)?.coach?.name ?? null,
    booked: n(s.id, [...TAKES_PLACE]),
    waitlist: n(s.id, ["WAITLIST"]),
    attended: n(s.id, ["ATTENDED"]),
  }));
}
