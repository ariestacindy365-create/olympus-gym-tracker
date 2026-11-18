import "server-only";
import { prisma } from "@/lib/prisma";
import { BOOKING_OPEN, needsBooking, pickMembership, weekdayOf } from "@/lib/bookingRules";

export interface TrainingGate {
  closed: boolean;
  /** On the waitlist for a class that day. */
  waitlist: boolean;
  /** Has a package that can book a class that day. */
  canBook: boolean;
}

/** Whether a member may log a workout on `day` (a date key), or must book a class first. */
export async function trainingGate(userId: string, day: Date, opts: { ptClient: boolean }): Promise<TrainingGate> {
  if (!BOOKING_OPEN) return { closed: false, waitlist: false, canBook: false };
  const dayStr = day.toISOString().slice(0, 10);
  const [bookings, memberships, slots, logged] = await Promise.all([
    prisma.classBooking.findMany({ where: { userId, classDate: day, status: { in: ["BOOKED", "ATTENDED", "WAITLIST"] } }, select: { status: true } }),
    prisma.membership.findMany({ where: { userId, startsAt: { lte: day }, expiresAt: { gte: day } } }),
    prisma.classSlot.count({ where: { weekday: weekdayOf(dayStr) } }),
    prisma.setEntry.count({ where: { memberId: userId, workoutDate: day } }),
  ]);
  const closed = needsBooking({
    day: dayStr,
    booked: bookings.some((b) => b.status !== "WAITLIST"),
    ptClient: opts.ptClient,
    ownTraining: memberships.some((m) => !m.canBook),
    classesThatDay: slots > 0,
    loggedThatDay: logged > 0,
  });
  return { closed, waitlist: bookings.some((b) => b.status === "WAITLIST"), canBook: !!pickMembership(memberships, dayStr) };
}
