import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeWaNumber } from "@/lib/whatsapp";
import { scheduleMemberFollowUps, scheduleRenewalReminder } from "@/lib/leads";
import { BOOKABLE, type MembershipKind } from "@/lib/fitquarter";
import { NO_EXPIRY_END, packageEnd, packageStart } from "@/lib/packageRules";
import { jakartaToday } from "@/lib/birthDate";
import type { PaymentMethod, Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export const ORDER_NOTE = "Dibeli lewat aplikasi member";

export class OrderError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

const key = (day: string) => new Date(`${day}T00:00:00Z`);

/** 1–499, not used by another open order of the same price, so each transfer amount is unique. */
export async function pickUniqueCode(price: number): Promise<number> {
  const taken = new Set(
    (await prisma.membershipOrder.findMany({ where: { price, status: { in: ["UNPAID", "PENDING"] } }, select: { uniqueCode: true } })).map((o) => o.uniqueCode)
  );
  const free = Array.from({ length: 499 }, (_, i) => i + 1).filter((c) => !taken.has(c));
  return free[Math.floor(Math.random() * free.length)] ?? 1 + Math.floor(Math.random() * 499);
}

/** Unpaid picks older than a day are dropped, so the member can start over. */
export async function closeStaleUnpaid(userId: string, now = new Date()) {
  await prisma.membershipOrder.updateMany({
    where: { userId, status: "UNPAID", createdAt: { lt: new Date(now.getTime() - 86_400_000) } },
    data: { status: "CANCELLED" },
  });
}

interface Sold {
  userId: string;
  name: string;
  packageName: string;
  kind: MembershipKind;
  credits: number | null;
  durationDays: number | null;
  durationMonths: number | null;
  amount: number;
  paymentMethod: PaymentMethod;
  waNumber: string | null;
  proofImageFileId?: string | null;
  note: string;
  staffId: string;
  orderId?: string;
}

/**
 * The membership a sale gives, plus a Payment on the member's lead (found by
 * account or WhatsApp number, else created) so it shows in the reports,
 * prints a receipt and gets the renewal reminder.
 */
async function grant(tx: Tx, s: Sold, now: Date) {
  const today = jakartaToday();
  const unlimited = await tx.membership.findFirst({
    where: { userId: s.userId, kind: "BOOTCAMP_UNLIMITED", expiresAt: { gte: key(today) } },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true },
  });
  const start = packageStart(s.kind, today, unlimited?.expiresAt.toISOString().slice(0, 10) ?? null);
  const end = packageEnd(s, start);

  const waNumberNormalized = s.waNumber ? normalizeWaNumber(s.waNumber) : "";
  let lead =
    (await tx.lead.findFirst({ where: { userId: s.userId, deletedAt: null }, orderBy: { capturedAt: "desc" } })) ??
    (waNumberNormalized ? await tx.lead.findFirst({ where: { waNumberNormalized, deletedAt: null } }) : null);
  let newlyMember = false;
  if (!lead) {
    lead = await tx.lead.create({
      data: { name: s.name, waNumber: s.waNumber ?? "", waNumberNormalized, status: "MEMBER", convertedAt: now, capturedById: s.staffId, userId: s.userId },
    });
    newlyMember = true;
  } else {
    newlyMember = lead.status !== "MEMBER" && !lead.convertedAt;
    lead = await tx.lead.update({ where: { id: lead.id }, data: { userId: s.userId, status: "MEMBER", convertedAt: lead.convertedAt ?? now } });
  }
  const expiresAt = end === NO_EXPIRY_END ? null : key(end);
  const payment = await tx.payment.create({
    data: {
      leadId: lead.id,
      packageName: s.packageName,
      amount: s.amount,
      paymentMethod: s.paymentMethod,
      paidAt: now,
      durationDays: s.durationDays,
      expiresAt,
      proofImageFileId: s.proofImageFileId ?? null,
      note: s.note,
      createdById: s.staffId,
    },
  });
  const membership = await tx.membership.create({
    data: {
      userId: s.userId,
      packageName: s.packageName,
      kind: s.kind,
      canBook: BOOKABLE.has(s.kind),
      credits: s.credits,
      startsAt: key(start),
      expiresAt: key(end),
      orderId: s.orderId ?? null,
      createdById: s.staffId,
    },
  });
  return { lead, payment, membership, newlyMember, expiresAt };
}

async function afterGrant(r: { lead: { id: string }; newlyMember: boolean; expiresAt: Date | null }, now: Date) {
  if (r.expiresAt) await scheduleRenewalReminder({ leadId: r.lead.id, expiresAt: r.expiresAt });
  if (r.newlyMember) await scheduleMemberFollowUps({ leadId: r.lead.id, convertedAt: now });
}

/** Confirms a pending app order (admin saw the transfer arrive). */
export async function approveOrder(orderId: string, reviewerId: string, now = new Date()) {
  const order = await prisma.membershipOrder.findUnique({ where: { id: orderId }, include: { user: { select: { name: true } } } });
  if (!order) throw new OrderError("Pesanan tidak ditemukan.", 404);
  if (order.status !== "PENDING") throw new OrderError("Pesanan ini belum dikirim atau sudah diproses.", 409);
  const result = await prisma.$transaction(async (tx) => {
    // Claim the order first so two admins tapping at once can't both confirm it.
    const claimed = await tx.membershipOrder.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: now } });
    if (claimed.count === 0) throw new OrderError("Pesanan ini sudah diproses.", 409);
    const r = await grant(
      tx,
      {
        userId: order.userId,
        name: order.user.name,
        packageName: order.packageName,
        kind: order.kind,
        credits: order.credits,
        durationDays: order.durationDays,
        durationMonths: order.durationMonths,
        // What actually came in: the price plus the unique code.
        amount: order.price + order.uniqueCode,
        paymentMethod: order.paymentMethod ?? "TRANSFER",
        waNumber: order.waNumber,
        proofImageFileId: order.proofImageFileId,
        note: [ORDER_NOTE, order.uniqueCode ? `kode unik ${order.uniqueCode}` : null, order.senderName ? `pengirim ${order.senderName}` : null].filter(Boolean).join(" · "),
        staffId: reviewerId,
        orderId: order.id,
      },
      now
    );
    await tx.membershipOrder.update({ where: { id: orderId }, data: { paymentId: r.payment.id, proofImageData: null } });
    return r;
  });
  await afterGrant(result, now);
  return { ...result, order };
}

export const DESK_METHODS = ["TUNAI", "DEBIT", "KARTU_KREDIT", "QRIS", "TRANSFER"] as const;

/** A member pays at the front desk (cash, debit or credit card, QRIS, transfer): active straight away. */
export async function sellAtDesk(opts: { userId: string; packageId: string; paymentMethod: (typeof DESK_METHODS)[number]; waNumber?: string | null; staffId: string; now?: Date }) {
  const now = opts.now ?? new Date();
  const [member, pkg] = await Promise.all([
    prisma.user.findFirst({ where: { id: opts.userId, role: "MEMBER" }, select: { id: true, name: true } }),
    prisma.package.findUnique({ where: { id: opts.packageId } }),
  ]);
  if (!member) throw new OrderError("Member tidak ditemukan.", 404);
  if (!pkg || !pkg.isActive || !pkg.kind) throw new OrderError("Paket ini tidak bisa dijual sebagai membership.", 400);
  const kind = pkg.kind;
  const result = await prisma.$transaction((tx) =>
    grant(
      tx,
      {
        userId: member.id,
        name: member.name,
        packageName: pkg.name,
        kind,
        credits: pkg.credits,
        durationDays: pkg.durationDays,
        durationMonths: pkg.durationMonths,
        amount: pkg.price,
        paymentMethod: opts.paymentMethod,
        waNumber: opts.waNumber ?? null,
        note: "Dibeli di meja admin",
        staffId: opts.staffId,
      },
      now
    )
  );
  await afterGrant(result, now);
  return result;
}
