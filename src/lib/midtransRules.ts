// Midtrans Core API, pure parts (no network, no database) so the feature
// guard can check them. Server-side only: uses node:crypto.

import { createHash } from "node:crypto";
import type { VaBank } from "@/lib/vaBanks";

/** Midtrans order_id for one VA attempt on an order (≤ 50 chars, unique per attempt). */
export const gatewayOrderIdFor = (orderId: string, now: Date) => `${orderId}-${now.getTime().toString(36)}`;

/** Body of POST /v2/charge for a virtual account (Mandiri is "echannel"). */
export function chargeBody(opts: {
  gatewayOrderId: string;
  amount: number;
  bank: VaBank;
  item: { id: string; name: string };
  customer: { name: string; email: string; phone?: string | null };
  expiryHours?: number;
}) {
  const base = {
    transaction_details: { order_id: opts.gatewayOrderId, gross_amount: opts.amount },
    item_details: [{ id: opts.item.id.slice(0, 50), price: opts.amount, quantity: 1, name: opts.item.name.slice(0, 50) }],
    customer_details: { first_name: opts.customer.name.slice(0, 255), email: opts.customer.email, ...(opts.customer.phone ? { phone: opts.customer.phone } : {}) },
    custom_expiry: { expiry_duration: opts.expiryHours ?? 24, unit: "hour" },
  };
  return opts.bank === "mandiri"
    ? { ...base, payment_type: "echannel", echannel: { bill_info1: "Pembayaran:", bill_info2: "Paket Olympus" } }
    : { ...base, payment_type: "bank_transfer", bank_transfer: { bank: opts.bank } };
}

/** Midtrans times are Jakarta wall clock: "2026-11-20 16:00:00". */
export function midtransTime(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v)) return null;
  return new Date(`${v.replace(" ", "T")}+07:00`);
}

/** The number to pay to, from a charge (or status) response; null when Midtrans refused. */
export function parseCharge(res: Record<string, unknown>): { vaNumber: string; billerCode: string | null; expiresAt: Date | null } | null {
  if (!["200", "201"].includes(String(res.status_code ?? ""))) return null;
  const expiresAt = midtransTime(res.expiry_time);
  if (typeof res.bill_key === "string" && res.bill_key) return { vaNumber: res.bill_key, billerCode: typeof res.biller_code === "string" ? res.biller_code : null, expiresAt };
  if (typeof res.permata_va_number === "string" && res.permata_va_number) return { vaNumber: res.permata_va_number, billerCode: null, expiresAt };
  const va = Array.isArray(res.va_numbers) ? (res.va_numbers[0] as { va_number?: unknown } | undefined) : undefined;
  if (va && typeof va.va_number === "string" && va.va_number) return { vaNumber: va.va_number, billerCode: null, expiresAt };
  return null;
}

/** HTTP notification check: SHA512(order_id + status_code + gross_amount + server key). */
export function signatureOk(n: Record<string, unknown>, serverKey: string): boolean {
  if (!serverKey || typeof n.signature_key !== "string") return false;
  const expected = createHash("sha512").update(`${n.order_id ?? ""}${n.status_code ?? ""}${n.gross_amount ?? ""}${serverKey}`).digest("hex");
  return expected === n.signature_key;
}

/** What a transaction status means for the order. */
export function vaOutcome(s: { transaction_status?: unknown; fraud_status?: unknown; gross_amount?: unknown }, expectedAmount: number): "paid" | "pending" | "dead" | "mismatch" {
  const status = String(s.transaction_status ?? "");
  if (status === "settlement" || (status === "capture" && String(s.fraud_status ?? "accept") === "accept")) {
    return Math.round(Number(s.gross_amount)) === expectedAmount ? "paid" : "mismatch";
  }
  if (["expire", "cancel", "deny", "failure"].includes(status)) return "dead";
  return "pending";
}
