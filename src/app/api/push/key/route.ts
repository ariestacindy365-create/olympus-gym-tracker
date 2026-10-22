import { NextResponse } from "next/server";
import { getVapidKeys } from "@/lib/webPush";

// The public VAPID key browsers need to subscribe (public by design).
export async function GET() {
  const { publicKey } = await getVapidKeys();
  return NextResponse.json({ publicKey });
}
