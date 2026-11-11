import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMembershipOrderSchema } from "@/lib/validation";
import { uploadProofImage } from "@/lib/googleDrive";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatRupiah } from "@/lib/packages";
import { Role } from "@/generated/prisma/client";

// A member buys a package: pays by transfer/QRIS and sends the proof; an
// admin confirms it at /leads/member-app.
export async function POST(request: NextRequest) {
  const member = await getCurrentUser();
  if (!member || member.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createMembershipOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const pkg = await prisma.package.findUnique({ where: { id: parsed.data.packageId } });
  if (!pkg || !pkg.isActive || !pkg.showInApp || !pkg.durationDays) {
    return NextResponse.json({ error: "Paket ini tidak tersedia." }, { status: 404 });
  }
  const pending = await prisma.membershipOrder.findFirst({ where: { userId: member.id, status: "PENDING" } });
  if (pending) {
    return NextResponse.json({ error: "Masih ada pembelian yang menunggu konfirmasi admin." }, { status: 409 });
  }

  // Proofs go to the same Drive folder as front-desk payments; without Drive
  // the compressed image is kept on the order.
  let proofImageFileId: string | null = null;
  let proofImageData: string | null = null;
  const folderId = process.env.GOOGLE_DRIVE_PAYMENTS_FOLDER_ID;
  if (folderId) {
    try {
      proofImageFileId = await uploadProofImage({ dataUrl: parsed.data.proofImage, filename: `app-${member.id}-${Date.now()}.jpg`, folderId });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mengunggah bukti pembayaran." }, { status: 500 });
    }
  } else {
    proofImageData = parsed.data.proofImage;
  }

  const order = await prisma.membershipOrder.create({
    data: {
      userId: member.id,
      packageId: pkg.id,
      packageName: pkg.name,
      price: pkg.price,
      durationDays: pkg.durationDays,
      credits: pkg.credits,
      paymentMethod: parsed.data.paymentMethod,
      waNumber: parsed.data.waNumber,
      proofImageFileId,
      proofImageData,
    },
    select: { id: true, status: true },
  });

  after(() =>
    sendTelegramMessage(
      `🧾 <b>Pembelian member dari aplikasi</b>\n${escapeHtml(member.name)} · ${escapeHtml(pkg.name)} · ${formatRupiah(pkg.price)}\nKonfirmasi di menu Member App.`
    ).catch(() => {})
  );

  return NextResponse.json({ order });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
