import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeWaNumber } from "@/lib/whatsapp";
import { scheduleMemberFollowUps, scheduleRenewalReminder } from "@/lib/leads";
import { BOOKABLE, type MembershipKind } from "@/lib/fitquarter";
import { NO_EXPIRY_END, packageEnd, packageStart } from "@/lib/packageRules";
import { jakartaToday } from "@/lib/birthDate";
import { uploadProofImage } from "@/lib/googleDrive";
import { lockForWrite } from "@/lib/writeLock";
import { notifyUsers } from "@/lib/notify";
import { cancelVa, chargeVa, vaStatus } from "@/lib/midtrans";
import { gatewayOrderIdFor, parseCharge, vaOutcome } from "@/lib/midtransRules";
import { VA_BANK_LABEL, type VaBank } from "@/lib/vaBanks";
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

/** Why an order was closed when the member never sent the proof (shown to them, in case they did transfer). */
export const AUTO_CLOSED = "Bukti transfer tidak dikirim dalam 3 hari";

/**
 * Unpaid picks older than 3 days are dropped, so the member can start
 * over. Marked AUTO_CLOSED: the member sees it was closed and, if they
 * already transferred, to contact the desk instead of paying again.
 */
export async function closeStaleUnpaid(userId: string, now = new Date()) {
  await prisma.membershipOrder.updateMany({
    where: { userId, status: "UNPAID", createdAt: { lt: new Date(now.getTime() - 3 * 86_400_000) } },
    data: { status: "CANCELLED", rejectReason: AUTO_CLOSED },
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
      paymentId: payment.id,
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
  // A proof kept on the order (no Drive, or Drive failed when it was sent)
  // moves to Drive now if it can; otherwise it stays on the order, so the
  // payment still has its proof after approval.
  let proofImageFileId = order.proofImageFileId;
  const folderId = process.env.GOOGLE_DRIVE_PAYMENTS_FOLDER_ID;
  if (!proofImageFileId && order.proofImageData && folderId) {
    try {
      proofImageFileId = await uploadProofImage({ dataUrl: order.proofImageData, filename: `app-${order.userId}-${now.getTime()}.jpg`, folderId });
    } catch (error) {
      console.error("Proof upload to Drive failed on approval, keeping it on the order", error);
    }
  }
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
        proofImageFileId,
        note: [ORDER_NOTE, order.uniqueCode ? `kode unik ${order.uniqueCode}` : null, order.senderName ? `pengirim ${order.senderName}` : null].filter(Boolean).join(" · "),
        staffId: reviewerId,
        orderId: order.id,
      },
      now
    );
    await tx.membershipOrder.update({ where: { id: orderId }, data: { paymentId: r.payment.id, ...(proofImageFileId ? { proofImageFileId, proofImageData: null } : {}) } });
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

/** Of these payments, the ones from an app order whose transfer proof is kept on the order (not in Drive). */
export async function paymentsWithOrderProof(paymentIds: string[]): Promise<Set<string>> {
  if (paymentIds.length === 0) return new Set();
  const rows = await prisma.membershipOrder.findMany({ where: { paymentId: { in: paymentIds }, proofImageData: { not: null } }, select: { paymentId: true } });
  return new Set(rows.map((r) => r.paymentId!));
}

// --- Virtual account (Midtrans): paid and activated without the desk ---

/** Who the books show as recording an automatic payment: the owner (else an admin). */
async function systemStaffId(): Promise<string> {
  const staff =
    (await prisma.user.findFirst({ where: { role: "OWNER" }, orderBy: { createdAt: "asc" }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true } }));
  if (!staff) throw new Error("No owner or admin to record the payment");
  return staff.id;
}

/**
 * Gives the member a VA number for their unpaid order: the package price,
 * no unique code (the number identifies the payment). Another bank, or an
 * expired number, makes a new one and cancels the old.
 */
export async function startVa(opts: { orderId: string; userId: string; bank: VaBank; now?: Date }) {
  const now = opts.now ?? new Date();
  const order = await prisma.membershipOrder.findFirst({ where: { id: opts.orderId, userId: opts.userId, status: "UNPAID" }, include: { user: { select: { name: true, email: true } } } });
  if (!order) throw new OrderError("Pembelian ini sudah dikirim atau dibatalkan.", 409);
  const live = order.vaNumber && order.vaExpiresAt && order.vaExpiresAt > now;
  if (live && order.vaBank === opts.bank) return order;
  if (order.gatewayOrderId) await cancelVa(order.gatewayOrderId);
  const gatewayOrderId = gatewayOrderIdFor(order.id, now);
  const res = await chargeVa({
    gatewayOrderId,
    amount: order.price,
    bank: opts.bank,
    item: { id: order.packageId ?? order.id, name: order.packageName },
    customer: { name: order.user.name, email: order.user.email, phone: order.waNumber },
  });
  const va = parseCharge(res);
  if (!va) {
    console.error("Midtrans charge refused", gatewayOrderId, res.status_code, res.status_message);
    throw new OrderError("Nomor virtual account belum bisa dibuat. Coba lagi sebentar, atau pakai transfer manual.", 502);
  }
  return prisma.membershipOrder.update({
    where: { id: order.id },
    data: { vaBank: opts.bank, vaNumber: va.vaNumber, vaBillerCode: va.billerCode, gatewayOrderId, vaExpiresAt: va.expiresAt ?? new Date(now.getTime() + 24 * 3_600_000) },
  });
}

/** Paid at the bank: the package goes live, recorded as a Virtual Account payment. */
async function settleVa(orderId: string, now: Date) {
  const reviewerId = await systemStaffId();
  const result = await prisma.$transaction(async (tx) => {
    await lockForWrite(tx);
    const order = await tx.membershipOrder.findUnique({ where: { id: orderId }, include: { user: { select: { name: true } } } });
    // Paid even if the member cancelled or it timed out: the money came in.
    if (!order || !["UNPAID", "CANCELLED"].includes(order.status)) return null;
    await tx.membershipOrder.update({ where: { id: orderId }, data: { status: "APPROVED", paymentMethod: "VIRTUAL_ACCOUNT", rejectReason: null, reviewedById: reviewerId, reviewedAt: now } });
    const bank = order.vaBank ? (VA_BANK_LABEL[order.vaBank as VaBank] ?? order.vaBank) : "";
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
        amount: order.price,
        paymentMethod: "VIRTUAL_ACCOUNT",
        waNumber: order.waNumber,
        note: [ORDER_NOTE, `VA ${bank} ${order.vaNumber ?? ""}`.trim(), `Midtrans ${order.gatewayOrderId}`].join(" · "),
        staffId: reviewerId,
        orderId: order.id,
      },
      now
    );
    await tx.membershipOrder.update({ where: { id: orderId }, data: { paymentId: r.payment.id } });
    return { ...r, order };
  });
  if (!result) return null;
  await afterGrant(result, now);
  const until = result.membership.expiresAt.toISOString().slice(0, 10) === NO_EXPIRY_END ? "tanpa batas waktu" : `s/d ${fmtDay(result.membership.expiresAt)}`;
  const staff = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "OWNER"] } }, select: { id: true } });
  await Promise.all([
    notifyUsers([result.order.userId], {
      type: "MEMBERSHIP",
      title: "Paket aktif ✅",
      body: `Pembayaran ${result.order.packageName} diterima, aktif mulai ${fmtDay(result.membership.startsAt)} ${until}.`,
      url: "/member/paket",
    }),
    notifyUsers(
      staff.map((s) => s.id),
      { type: "MEMBERSHIP", title: "Pembayaran VA masuk", body: `${result.order.user.name}: ${result.order.packageName} · Rp ${result.order.price.toLocaleString("id-ID")} (otomatis)`, url: "/leads/paket" }
    ),
  ]).catch(() => {});
  return result;
}

const fmtDay = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Asks Midtrans how a VA attempt stands and acts on it: paid → package
 * live; expired/cancelled → the number is cleared so the member can make a
 * new one. Called by the webhook and when the member looks.
 */
export async function syncVa(gatewayOrderId: string, now = new Date()): Promise<"paid" | "pending" | "dead" | "mismatch" | "unknown"> {
  const order = await prisma.membershipOrder.findUnique({ where: { gatewayOrderId }, select: { id: true, price: true, status: true } });
  if (!order) return "unknown";
  if (order.status === "APPROVED") return "paid";
  const status = await vaStatus(gatewayOrderId);
  const outcome = vaOutcome(status, order.price);
  if (outcome === "paid") await settleVa(order.id, now);
  else if (outcome === "dead") await prisma.membershipOrder.updateMany({ where: { id: order.id, gatewayOrderId, status: "UNPAID" }, data: { vaNumber: null, vaBillerCode: null, vaExpiresAt: null } });
  else if (outcome === "mismatch") console.error("Midtrans amount mismatch", gatewayOrderId, status.gross_amount, order.price);
  return outcome;
}

/** The member's recent VA attempts, checked with Midtrans (the webhook may have been missed). */
export async function syncOpenVas(userId: string, now = new Date()) {
  const open = await prisma.membershipOrder.findMany({
    where: { userId, status: { in: ["UNPAID", "CANCELLED"] }, gatewayOrderId: { not: null }, updatedAt: { gt: new Date(now.getTime() - 4 * 86_400_000) } },
    select: { gatewayOrderId: true },
  });
  for (const o of open) await syncVa(o.gatewayOrderId!, now).catch((error) => console.error("VA sync failed", error));
}
