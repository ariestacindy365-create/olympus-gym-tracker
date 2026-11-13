import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProofImage } from "@/lib/googleDrive";
import { Role } from "@/generated/prisma/client";

// The proof photo of an app purchase, for the admin/owner confirming it.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/membership-orders/[orderId]/proof">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { orderId } = await ctx.params;
  const order = await prisma.membershipOrder.findUnique({ where: { id: orderId }, select: { proofImageFileId: true, proofImageData: true } });
  const headers = { "Cache-Control": "private, max-age=3600" };
  if (order?.proofImageData) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(order.proofImageData);
    if (m) return new NextResponse(new Uint8Array(Buffer.from(m[2], "base64")), { headers: { ...headers, "Content-Type": m[1] } });
  }
  if (!order?.proofImageFileId) {
    return NextResponse.json({ error: "Tidak ada bukti pembayaran." }, { status: 404 });
  }
  try {
    const { buffer, mimeType } = await getProofImage(order.proofImageFileId);
    return new NextResponse(new Uint8Array(buffer), { headers: { ...headers, "Content-Type": mimeType } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mengambil bukti pembayaran." }, { status: 500 });
  }
}
