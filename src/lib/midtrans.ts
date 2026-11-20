import "server-only";
import { parseVaBanks, type GatewayMethod } from "@/lib/vaBanks";
import { chargeBody } from "@/lib/midtransRules";

// Midtrans Core API over HTTPS. Keys live in the environment (Vercel):
// MIDTRANS_SERVER_KEY (sandbox "SB-Mid-server-…" or production), and
// MIDTRANS_IS_PRODUCTION=true for real money. MIDTRANS_BASE_URL overrides
// the host (local tests).

export const midtransEnabled = () => !!process.env.MIDTRANS_SERVER_KEY;
export const midtransServerKey = () => process.env.MIDTRANS_SERVER_KEY ?? "";
/** The VA banks members can pick (MIDTRANS_VA_BANKS, e.g. "bni,bri,mandiri,permata"); none set → VA off, QRIS only. */
export const enabledVaBanks = () => parseVaBanks(process.env.MIDTRANS_VA_BANKS);
/** Sandbox: no real money; the payment screen shows test helpers. */
export const midtransSandbox = () => process.env.MIDTRANS_IS_PRODUCTION !== "true";

function baseUrl() {
  return process.env.MIDTRANS_BASE_URL ?? (process.env.MIDTRANS_IS_PRODUCTION === "true" ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com");
}

async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${midtransServerKey()}:`).toString("base64")}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Creates the VA (POST /v2/charge). Returns Midtrans' raw answer. */
export function chargeVa(opts: Parameters<typeof chargeBody>[0] & { bank: GatewayMethod }) {
  return call("POST", "/v2/charge", chargeBody(opts));
}

/** GET /v2/{order_id}/status */
export function vaStatus(gatewayOrderId: string) {
  return call("GET", `/v2/${encodeURIComponent(gatewayOrderId)}/status`);
}

/** POST /v2/{order_id}/cancel: best effort, so an abandoned number can't be paid. */
export async function cancelVa(gatewayOrderId: string) {
  try {
    await call("POST", `/v2/${encodeURIComponent(gatewayOrderId)}/cancel`);
  } catch (error) {
    console.error("Midtrans cancel failed", gatewayOrderId, error);
  }
}
