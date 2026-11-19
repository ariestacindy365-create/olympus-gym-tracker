import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncVa } from "@/lib/orders";
import { cancelVa } from "@/lib/midtrans";
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
  const body = await request.json().catch(() => null);
  // Missing or broken JSON: say so in Indonesian, not zod's English.
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  const parsed = submitMembershipPaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  const order = await prisma.membershipOrder.findFirst({ where: { id: orderId, userId: member.id, status: "UNPAID" } });
  if (!order) return NextResponse.json({ error: "Pembelian ini sudah dikirim atau dibatalkan." }, { status: 409 });

  // Proofs go to the same Drive folder as front-desk payments; without Drive
  // (or when the upload fails) the compressed image is kept on the order
  // until it's approved.
  let proofImageFileId: string | null = null;
  let proofImageData: string | null = null;
  const folderId = process.env.GOOGLE_DRIVE_PAYMENTS_FOLDER_ID;
  if (folderId) {
    try {
      proofImageFileId = await uploadProofImage({ dataUrl: parsed.data.proofImage, filename: `app-${member.id}-${Date.now()}.jpg`, folderId });
    } catch (error) {
      // Drive down or its sign-in expired: keep the proof on the order so
      // the member isn't stuck and the admin can still see it.
      console.error("Proof upload to Drive failed, keeping it on the order", error);
      proofImageData = parsed.data.proofImage;
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
  // A VA that was already paid isn't cancelled; an unpaid one is closed at Midtrans too.
  const va = await prisma.membershipOrder.findFirst({ where: { id: orderId, userId: member.id, status: "UNPAID", gatewayOrderId: { not: null } }, select: { gatewayOrderId: true } });
  if (va?.gatewayOrderId) {
    if ((await syncVa(va.gatewayOrderId).catch(() => "pending")) === "paid") return NextResponse.json({ error: "Pembayaran sudah masuk, paketmu sudah aktif." }, { status: 409 });
    await cancelVa(va.gatewayOrderId);
  }
  const done = await prisma.membershipOrder.updateMany({
    where: { id: orderId, userId: member.id, status: { in: ["UNPAID", "PENDING"] } },
    data: { status: "CANCELLED", proofImageData: null },
  });
  if (done.count === 0) return NextResponse.json({ error: "Pesanan ini sudah diproses atau tidak ditemukan." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
