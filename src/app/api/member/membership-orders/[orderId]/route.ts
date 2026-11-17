import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitMembershipPaymentSchema } from "@/lib/validation";
import { uploadProofImage } from "@/lib/googleDrive";
import { sendTelegramMessage } from "@/lib/telegram";
import { notifyUsers } from "@/lib/notify";
import { formatRupiah } from "@/lib/packages";
import { Role } from "@/generated/prisma/client";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The member sends the proof of their transfer; it then waits for an admin
// to check the money arrived (/leads/paket).
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/member/membership-orders/[orderId]">) {
  const member = await getCurrentUser();
  if (!member || member.role !== Role.MEMBER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { orderId } = await ctx.params;
  const parsed = submitMembershipPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  const order = await prisma.membershipOrder.findFirst({ where: { id: orderId, userId: member.id, status: "UNPAID" } });
  if (!order) return NextResponse.json({ error: "Pembelian ini sudah dikirim atau dibatalkan." }, { status: 409 });

  // Proofs go to the same Drive folder as front-desk payments; without Drive
  // the compressed image is kept on the order until it's approved.
  let proofImageFileId: string | null = null;
  let proofImageData: string | null = null;
  const folderId = process.env.GOOGLE_DRIVE_PAYMENTS_FOLDER_ID;
  if (folderId) {
    try {
      proofImageFileId = await uploadProofImage({ dataUrl: parsed.data.proofImage, filename: `app-${member.id}-${Date.now()}.jpg`, folderId });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mengunggah bukti transfer." }, { status: 500 });
    }
  } else proofImageData = parsed.data.proofImage;

  const done = await prisma.membershipOrder.updateMany({
    where: { id: orderId, status: "UNPAID" },
    data: {
      status: "PENDING",
      paymentMethod: "TRANSFER",
      waNumber: parsed.data.waNumber,
      senderName: parsed.data.senderName,
      proofImageFileId,
      proofImageData,
      // The admin's queue is ordered by when the proof came in.
      createdAt: new Date(),
    },
  });
  if (done.count === 0) return NextResponse.json({ error: "Pembelian ini sudah dikirim atau dibatalkan." }, { status: 409 });

  const amount = formatRupiah(order.price + order.uniqueCode);
  after(async () => {
    const staff = await prisma.user.findMany({ where: { role: { in: [Role.ADMIN, Role.OWNER] } }, select: { id: true } });
    await notifyUsers(
      staff.map((s) => s.id),
      { type: "MEMBERSHIP", title: "Pembelian paket menunggu verifikasi", body: `${member.name} · ${order.packageName} · ${amount} dari ${parsed.data.senderName}`, url: "/leads/paket" }
    ).catch(() => {});
    await sendTelegramMessage(
      `🧾 <b>Pembelian paket dari aplikasi</b>\n${escapeHtml(member.name)} · ${escapeHtml(order.packageName)} · ${amount}\nPengirim: ${escapeHtml(parsed.data.senderName)}\nVerifikasi di menu Paket.`
    ).catch(() => {});
  });
  return NextResponse.json({ ok: true });
}

// The member cancels until an admin has checked it.
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/member/membership-orders/[orderId]">) {
  const member = await getCurrentUser();
  if (!member || member.role !== Role.MEMBER) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { orderId } = await ctx.params;
  const done = await prisma.membershipOrder.updateMany({
    where: { id: orderId, userId: member.id, status: { in: ["UNPAID", "PENDING"] } },
    data: { status: "CANCELLED", proofImageData: null },
  });
  if (done.count === 0) return NextResponse.json({ error: "Pesanan ini sudah diproses atau tidak ditemukan." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
