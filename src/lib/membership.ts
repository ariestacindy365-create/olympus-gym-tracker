import "server-only";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { normalizeWaNumber } from "@/lib/whatsapp";
import { scheduleMemberFollowUps, scheduleRenewalReminder } from "@/lib/leads";
import type { Membership } from "@/generated/prisma/client";

export const ORDER_NOTE = "Dibeli lewat aplikasi member";

/** Credits left on a credit package; null = unlimited. */
export function creditsLeft(m: Pick<Membership, "credits" | "creditsUsed">): number | null {
  return m.credits == null ? null : Math.max(0, m.credits - m.creditsUsed);
}

/** Running now and still usable (an empty credit package doesn't count). */
export function isUsable(m: Pick<Membership, "credits" | "creditsUsed" | "startsAt" | "expiresAt">, now = new Date()): boolean {
  if (m.startsAt > now || m.expiresAt <= now) return false;
  const left = creditsLeft(m);
  return left == null || left > 0;
}

export interface MembershipSummary {
  /** The package in use now: unlimited first, else the credit package ending soonest. */
  current: Membership | null;
  /** Bought or added but not started yet (they follow the current one). */
  upcoming: Membership[];
  /** The latest one that ended, for "masa aktif habis tanggal …". */
  lastEnded: Membership | null;
  /** Ends within a week with nothing bought after it. */
  endingSoon: boolean;
}

export async function getMembershipSummary(userId: string, now = new Date()): Promise<MembershipSummary> {
  const all = await prisma.membership.findMany({ where: { userId }, orderBy: { startsAt: "asc" } });
  const usable = all.filter((m) => isUsable(m, now));
  const current =
    usable.find((m) => m.credits == null) ?? [...usable].sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())[0] ?? null;
  const upcoming = all.filter((m) => m.startsAt > now);
  const started = all.filter((m) => m.startsAt <= now).sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());
  const lastEnded = current || upcoming.length ? null : (started[0] ?? null);
  const endingSoon = !!current && upcoming.length === 0 && current.expiresAt.getTime() - now.getTime() < 7 * 86_400_000;
  return { current, upcoming, lastEnded, endingSoon };
}

/** A new period starts when the member's last one ends (or now), so buying early never loses days. */
export async function nextStart(userId: string, now = new Date()): Promise<Date> {
  const last = await prisma.membership.findFirst({ where: { userId, expiresAt: { gt: now } }, orderBy: { expiresAt: "desc" } });
  return last && last.expiresAt > now ? last.expiresAt : now;
}

/**
 * Confirms a pending app order: the membership, plus a Payment on the
 * member's lead (found by account or WA number, else created) so it shows
 * in the reports, prints a receipt and gets the renewal reminder.
 */
export async function approveOrder(orderId: string, reviewerId: string, now = new Date()) {
  const order = await prisma.membershipOrder.findUnique({ where: { id: orderId }, include: { user: true } });
  if (!order) throw new OrderError("Pesanan tidak ditemukan.", 404);
  if (order.status !== "PENDING") throw new OrderError("Pesanan ini sudah diproses.", 409);

  const startsAt = await nextStart(order.userId, now);
  const expiresAt = addDays(startsAt, order.durationDays);
  const waNumberNormalized = normalizeWaNumber(order.waNumber);

  const result = await prisma.$transaction(async (tx) => {
    // Claim the order first so two admins tapping at once can't both confirm it.
    const claimed = await tx.membershipOrder.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: now },
    });
    if (claimed.count === 0) throw new OrderError("Pesanan ini sudah diproses.", 409);

    let lead =
      (await tx.lead.findFirst({ where: { userId: order.userId, deletedAt: null }, orderBy: { capturedAt: "desc" } })) ??
      (waNumberNormalized ? await tx.lead.findFirst({ where: { waNumberNormalized, deletedAt: null } }) : null);
    let newlyMember = false;
    if (!lead) {
      lead = await tx.lead.create({
        data: {
          name: order.user.name,
          waNumber: order.waNumber,
          waNumberNormalized,
          status: "MEMBER",
          convertedAt: now,
          capturedById: reviewerId,
          userId: order.userId,
        },
      });
      newlyMember = true;
    } else {
      newlyMember = lead.status !== "MEMBER" && !lead.convertedAt;
      lead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          userId: order.userId,
          status: "MEMBER",
          convertedAt: lead.convertedAt ?? now,
        },
      });
    }

    const payment = await tx.payment.create({
      data: {
        leadId: lead.id,
        packageName: order.packageName,
        amount: order.price,
        paymentMethod: order.paymentMethod,
        paidAt: now,
        durationDays: order.durationDays,
        expiresAt,
        proofImageFileId: order.proofImageFileId,
        note: ORDER_NOTE,
        createdById: reviewerId,
      },
    });

    const membership = await tx.membership.create({
      data: {
        userId: order.userId,
        packageName: order.packageName,
        credits: order.credits,
        startsAt,
        expiresAt,
        orderId: order.id,
        createdById: reviewerId,
      },
    });

    await tx.membershipOrder.update({ where: { id: orderId }, data: { paymentId: payment.id } });
    return { lead, payment, membership, newlyMember };
  });

  await scheduleRenewalReminder({ leadId: result.lead.id, expiresAt });
  if (result.newlyMember) await scheduleMemberFollowUps({ leadId: result.lead.id, convertedAt: now });
  return { ...result, order };
}

export class OrderError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

const dateFmt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });
export const formatMembershipDate = (d: Date) => dateFmt.format(d);
