import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { midtransServerKey } from "@/lib/midtrans";
import { signatureOk } from "@/lib/midtransRules";
import { syncVa } from "@/lib/orders";

// Midtrans HTTP notification (set as the Payment Notification URL in the
// Midtrans dashboard). The signature proves it's from Midtrans; the status
// is then read back from Midtrans itself before anything is activated.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.order_id !== "string") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!signatureOk(body, midtransServerKey())) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  try {
    const outcome = await syncVa(body.order_id);
    // Unknown order_id (e.g. Midtrans' dashboard test): acknowledge so it isn't retried.
    return NextResponse.json({ ok: true, outcome });
  } catch (error) {
    console.error("Midtrans notification failed", body.order_id, error);
    // 5xx makes Midtrans retry later.
    return NextResponse.json({ error: "Try again" }, { status: 500 });
  }
}
