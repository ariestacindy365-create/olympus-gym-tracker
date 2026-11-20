import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { BankInfoForm, DeskSale, OrderReview } from "@/components/leads/PackageDesk";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";
import { packageDetail } from "@/lib/packageRules";

const when = (d: Date) => d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

// Admin/owner: check app transfers, sell packages at the desk, and (owner) the bank account.
export default async function PackageDeskPage() {
  const user = await requireAnyRole(["ADMIN", "OWNER"]);
  const [pending, recent, packages, bank] = await Promise.all([
    prisma.membershipOrder.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, email: true } } } }),
    prisma.membershipOrder.findMany({ where: { status: { in: ["APPROVED", "REJECTED"] } }, orderBy: { reviewedAt: "desc" }, take: 8, include: { user: { select: { name: true } }, reviewedBy: { select: { name: true } } } }),
    prisma.package.findMany({ where: { isActive: true, kind: { not: null } }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    prisma.gymPaymentInfo.findUnique({ where: { id: 1 } }),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Membership" title="Paket member" subtitle="Verifikasi transfer dari aplikasi, dan jual paket ke member yang datang langsung." />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">
          Verifikasi transfer {pending.length > 0 && <span className="ml-1 rounded-full bg-danger px-2 py-0.5 text-sm text-white">{pending.length}</span>}
        </h2>
        {pending.length === 0 && <p className="text-sm text-muted">Tidak ada yang menunggu.</p>}
        {pending.map((o) => (
          <article key={o.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{o.user.name}</p>
                <p className="text-xs text-muted">
                  {o.packageName} · {packageDetail(o)} · dikirim {when(o.createdAt)}
                </p>
                <p className="text-xs text-muted">WA {o.waNumber ?? "-"}</p>
              </div>
              <p className="shrink-0 font-display text-xl font-bold tabular-nums">{formatRupiah(o.price + o.uniqueCode)}</p>
            </div>
            <a href={`/api/membership-orders/${o.id}/proof`} target="_blank" rel="noopener" className="self-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- the proof, through the authorised proxy */}
              <img src={`/api/membership-orders/${o.id}/proof`} alt={`Bukti transfer ${o.user.name}`} className="max-h-72 rounded-lg border border-border object-contain" />
            </a>
            <OrderReview orderId={o.id} amount={formatRupiah(o.price + o.uniqueCode)} senderName={o.senderName} />
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <h2 className="font-display text-xl font-bold">Jual di meja</h2>
        <DeskSale packages={packages.map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category ?? "Paket" }))} />
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Terakhir diproses</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {o.status === "APPROVED" ? "✓" : "✕"} {o.user.name} · {o.packageName}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {/* A VA or QRIS is paid at the package price, without the unique code. */}
                  {formatRupiah(o.gatewayOrderId && (o.paymentMethod === "VIRTUAL_ACCOUNT" || o.paymentMethod === "QRIS") ? o.price : o.price + o.uniqueCode)} · {PAYMENT_METHOD_LABEL[o.paymentMethod ?? "TRANSFER"]} · {o.reviewedBy?.name ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {user.role === "OWNER" && (
        <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <h2 className="font-display text-lg font-bold">Rekening tujuan transfer</h2>
          <p className="text-xs text-muted">Ditampilkan ke member saat membeli paket di aplikasi.</p>
          <BankInfoForm initial={{ bankName: bank?.bankName ?? "", accountNumber: bank?.accountNumber ?? "", accountName: bank?.accountName ?? "" }} />
        </section>
      )}
    </div>
  );
}
