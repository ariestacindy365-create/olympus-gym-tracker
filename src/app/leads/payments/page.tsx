import Link from "next/link";
import { getCurrentUser, requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RecordPaymentForm } from "@/components/leads/RecordPaymentForm";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  await requireAnyRole(["ADMIN", "OWNER"]);
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";
  const { leadId } = await searchParams;

  const [members, activePackages, recentPayments] = await Promise.all([
    prisma.lead.findMany({
      where: { status: { in: ["MEMBER", "RETENSI"] }, deletedAt: null },
      select: { id: true, name: true, waNumber: true },
      orderBy: { name: "asc" },
    }),
    prisma.package.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: 30,
      include: { lead: { select: { name: true, waNumber: true } }, createdBy: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pembayaran</h1>
        <p className="text-sm text-muted">Catat pembayaran atau perpanjangan paket member, lalu cetak struknya.</p>
      </div>

      {isAdmin && (
        <RecordPaymentForm
          members={members}
          packages={activePackages.map((p) => ({ name: p.name, price: p.price, durationDays: p.durationDays }))}
          initialLeadId={leadId}
        />
      )}

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Riwayat Pembayaran</h2>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-muted">Belum ada pembayaran tercatat.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recentPayments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {payment.lead.name} · {payment.packageName}
                  </p>
                  <p className="text-xs text-muted">
                    {formatRupiah(payment.amount)} · {PAYMENT_METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod} ·{" "}
                    {payment.paidAt.toLocaleDateString("id-ID")} · oleh {payment.createdBy.name}
                    {payment.expiresAt && ` · berlaku sampai ${payment.expiresAt.toLocaleDateString("id-ID")}`}
                  </p>
                </div>
                <Link href={`/leads/${payment.leadId}/receipt/${payment.id}`}>
                  <Button variant="secondary" className="px-3 py-1.5 text-xs">
                    Cetak Struk
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
