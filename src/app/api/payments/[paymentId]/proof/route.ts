import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProofImage } from "@/lib/googleDrive";
import { Role } from "@/generated/prisma/client";

// Proxies the payment's proof-of-payment photo out of Google Drive so the
// Drive file itself never has to be shared publicly — only a logged-in
// admin/owner viewing this route (via the service account's own access)
// can see it.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/payments/[paymentId]/proof">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { paymentId } = await ctx.params;
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { proofImageFileId: true },
  });
  if (!payment?.proofImageFileId) {
    return NextResponse.json({ error: "Tidak ada bukti pembayaran." }, { status: 404 });
  }

  try {
    const { buffer, mimeType } = await getProofImage(payment.proofImageFileId);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengambil bukti pembayaran." },
      { status: 500 }
    );
  }
}
