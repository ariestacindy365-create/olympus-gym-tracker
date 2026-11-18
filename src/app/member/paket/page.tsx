import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { TrialNotice } from "@/components/member/TrialNotice";
import { MembershipList } from "@/components/member/MembershipList";
import { CancelOrderButton, PackageShop } from "@/components/member/PackageShop";
import { claimImportedMember, membershipViews } from "@/lib/membership";
import { closeStaleUnpaid } from "@/lib/orders";
import { formatRupiah } from "@/lib/packages";
import { jakartaToday } from "@/lib/birthDate";

// Members see their packages and buy a new one (bank transfer + proof → admin checks).
export default async function MemberPackagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  await claimImportedMember(user);
  await closeStaleUnpaid(user.id);
  const today = jakartaToday();
  const [memberships, packages, bank, orders, imported] = await Promise.all([
    membershipViews(user.id, new Date(`${today}T00:00:00Z`)),
    prisma.package.findMany({ where: { isActive: true, showInApp: true, kind: { not: null } }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    prisma.gymPaymentInfo.findUnique({ where: { id: 1 } }),
    prisma.membershipOrder.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.importedMember.findUnique({ where: { userId: user.id }, select: { phone: true } }),
  ]);
  // Rejections from the last week stay visible.
  const weekAgo = new Date(`${today}T00:00:00Z`).getTime() - 7 * 86_400_000;
  const unpaid = orders.find((o) => o.status === "UNPAID") ?? null;
  const waiting = orders.find((o) => o.status === "PENDING") ?? null;
  const rejected = orders.find((o) => o.status === "REJECTED" && o.reviewedAt && o.reviewedAt.getTime() > weekAgo) ?? null;
  const last = orders.find((o) => o.waNumber || o.senderName);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Membership" title="Paket" subtitle="Paket yang kamu punya, dan beli paket baru dengan transfer bank." />
      <TrialNotice what="Beli paket lewat aplikasi" />
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-3 font-display text-lg font-bold">Paket kamu</h2>
        <MembershipList items={memberships} today={today} />
      </section>

      {waiting && (
        <section role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 p-4">
          <div>
            <p className="font-semibold">⏳ Menunggu verifikasi admin</p>
            <p className="text-sm">
              {waiting.packageName} · {formatRupiah(waiting.price + waiting.uniqueCode)}. Admin mengecek transfermu, lalu paket aktif dan kamu dapat notifikasi.
            </p>
          </div>
          <CancelOrderButton orderId={waiting.id} />
        </section>
      )}
      {rejected && !waiting && !unpaid && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          Pembelian {rejected.packageName} ditolak: {rejected.rejectReason}. Hubungi admin kalau sudah transfer.
        </p>
      )}

      <PackageShop
        packages={packages.map((p) => ({ id: p.id, name: p.name, price: p.price, credits: p.credits, durationDays: p.durationDays, durationMonths: p.durationMonths, category: p.category ?? "Paket", fineprint: p.fineprint }))}
        bank={{ bankName: bank?.bankName ?? "", accountNumber: bank?.accountNumber ?? "", accountName: bank?.accountName ?? "" }}
        lastWa={last?.waNumber ?? imported?.phone ?? ""}
        lastSender={last?.senderName ?? ""}
        openOrder={unpaid ? { id: unpaid.id, packageName: unpaid.packageName, price: unpaid.price, uniqueCode: unpaid.uniqueCode, credits: unpaid.credits, durationDays: unpaid.durationDays, durationMonths: unpaid.durationMonths } : null}
        blocked={!!waiting}
      />
    </div>
  );
}
