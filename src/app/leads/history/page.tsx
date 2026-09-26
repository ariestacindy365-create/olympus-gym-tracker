import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { requireAnyRole } from "@/lib/auth";
import { getFollowUpHistory, getDeletedLeads, getDeletedPayments, getDeletedSales } from "@/lib/leads";
import { todayDateKey } from "@/lib/workout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WhatsAppLink } from "@/components/leads/WhatsAppLink";
import { STATUS_LABEL, STATUS_TONE, FOLLOWUP_TYPE_LABEL, FOLLOWUP_TYPE_TONE } from "@/lib/leadStatusLabels";
import { waFollowUpMessage } from "@/lib/waScripts";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";

function FollowUpTypeBadge({ type }: { type: string }) {
  return <Badge tone={FOLLOWUP_TYPE_TONE[type] ?? "default"}>{FOLLOWUP_TYPE_LABEL[type] ?? type}</Badge>;
}

function LeadStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "default"}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export default async function LeadsHistoryPage() {
  const user = await requireAnyRole(["ADMIN", "OWNER"]);
  const adminId = user?.role === "ADMIN" ? user.id : undefined;

  const [{ done, dueNow, upcoming }, deletedLeads, deletedPayments, deletedSales] = await Promise.all([
    getFollowUpHistory(adminId),
    getDeletedLeads(adminId),
    getDeletedPayments(adminId),
    getDeletedSales(adminId),
  ]);

  const today = todayDateKey();
  const missedCount = dueNow.filter((fu) => fu.dueDate < today).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Riwayat Follow Up</h1>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Belum Follow Up ({dueNow.length})</h2>
        <p className="mb-3 text-xs text-muted">Sudah jatuh tempo (hari ini atau lebih awal), belum ditindaklanjuti.</p>
        {missedCount > 0 && (
          <p className="mb-3 text-sm font-medium text-danger">{missedCount} di antaranya sudah terlewat dari hari jatuh temponya.</p>
        )}
        {dueNow.length === 0 ? (
          <p className="text-sm text-muted">Tidak ada yang menunggu.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {dueNow.map((fu) => {
              const overdueDays = differenceInCalendarDays(today, fu.dueDate);
              return (
                <li key={fu.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <Link href={`/leads/${fu.leadId}`} className="font-medium hover:text-accent">
                      {fu.lead.name}
                    </Link>{" "}
                    <span className="text-xs text-muted">{fu.lead.waNumber} · jatuh tempo {fu.dueDate.toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdueDays > 0 && <Badge tone="danger">Terlambat {overdueDays} hari</Badge>}
                    <FollowUpTypeBadge type={fu.type} />
                    <LeadStatusBadge status={fu.lead.status} />
                    <WhatsAppLink waNumber={fu.lead.waNumber} message={waFollowUpMessage(fu.lead.name, fu.type)}>
                      WhatsApp
                    </WhatsAppLink>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Akan Follow Up ({upcoming.length})</h2>
        <p className="mb-3 text-xs text-muted">Terjadwal untuk beberapa hari ke depan.</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Tidak ada jadwal follow up mendatang.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((fu) => (
              <li key={fu.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <Link href={`/leads/${fu.leadId}`} className="font-medium hover:text-accent">
                    {fu.lead.name}
                  </Link>{" "}
                  <span className="text-xs text-muted">{fu.lead.waNumber} · terjadwal {fu.dueDate.toLocaleDateString("id-ID")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FollowUpTypeBadge type={fu.type} />
                  <LeadStatusBadge status={fu.lead.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Sudah Follow Up ({done.length})</h2>
        {done.length === 0 ? (
          <p className="text-sm text-muted">Belum ada follow up yang selesai.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {done.map((fu) => (
              <li key={fu.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <Link href={`/leads/${fu.leadId}`} className="font-medium hover:text-accent">
                    {fu.lead.name}
                  </Link>{" "}
                  <span className="text-xs text-muted">
                    {fu.lead.waNumber} · {fu.completedAt?.toLocaleDateString("id-ID")} oleh {fu.completedBy?.name}
                    {fu.note ? ` · "${fu.note}"` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FollowUpTypeBadge type={fu.type} />
                  <LeadStatusBadge status={fu.lead.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Lead Dihapus ({deletedLeads.length})</h2>
        {deletedLeads.length === 0 ? (
          <p className="text-sm text-muted">Belum ada lead yang dihapus.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {deletedLeads.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <Link href={`/leads/${lead.id}`} className="font-medium hover:text-accent">
                    {lead.name}
                  </Link>{" "}
                  <span className="text-xs text-muted">
                    {lead.waNumber} · dicapture oleh {lead.capturedBy.name} · dihapus{" "}
                    {lead.deletedAt?.toLocaleDateString("id-ID")} oleh {lead.deletedBy?.name}
                  </span>
                </div>
                <LeadStatusBadge status={lead.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Pembayaran Dihapus ({deletedPayments.length})</h2>
        {deletedPayments.length === 0 ? (
          <p className="text-sm text-muted">Belum ada pembayaran yang dihapus.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {deletedPayments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <Link href={`/leads/${payment.leadId}`} className="font-medium hover:text-accent">
                    {payment.lead.name}
                  </Link>{" "}
                  <span className="text-xs text-muted">
                    {payment.packageName} · {formatRupiah(payment.amount)} ·{" "}
                    {PAYMENT_METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod} · dicatat oleh{" "}
                    {payment.createdBy.name} · dihapus {payment.deletedAt?.toLocaleDateString("id-ID")} oleh{" "}
                    {payment.deletedBy?.name}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Penjualan Dihapus ({deletedSales.length})</h2>
        {deletedSales.length === 0 ? (
          <p className="text-sm text-muted">Belum ada penjualan yang dihapus.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {deletedSales.map((sale) => (
              <li
                key={sale.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{sale.productName}</p>
                  <span className="text-xs text-muted">
                    {formatRupiah(sale.price)} · {PAYMENT_METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod} ·
                    dicatat oleh {sale.createdBy.name} · dihapus {sale.deletedAt?.toLocaleDateString("id-ID")} oleh{" "}
                    {sale.deletedBy?.name}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
