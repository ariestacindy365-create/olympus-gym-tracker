import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getFollowUpHistory, getDeletedLeads } from "@/lib/leads";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WhatsAppLink } from "@/components/leads/WhatsAppLink";
import { STATUS_LABEL, STATUS_TONE, FOLLOWUP_TYPE_LABEL, FOLLOWUP_TYPE_TONE } from "@/lib/leadStatusLabels";
import { waFollowUpMessage } from "@/lib/waScripts";

function FollowUpTypeBadge({ type }: { type: string }) {
  return <Badge tone={FOLLOWUP_TYPE_TONE[type] ?? "default"}>{FOLLOWUP_TYPE_LABEL[type] ?? type}</Badge>;
}

function LeadStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "default"}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export default async function LeadsHistoryPage() {
  const user = await getCurrentUser();
  const adminId = user?.role === "ADMIN" ? user.id : undefined;

  const [{ done, dueNow, upcoming }, deletedLeads] = await Promise.all([
    getFollowUpHistory(adminId),
    getDeletedLeads(adminId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Riwayat Follow Up</h1>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Belum Follow Up ({dueNow.length})</h2>
        <p className="mb-3 text-xs text-muted">Sudah jatuh tempo (hari ini atau lebih awal), belum ditindaklanjuti.</p>
        {dueNow.length === 0 ? (
          <p className="text-sm text-muted">Tidak ada yang menunggu.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {dueNow.map((fu) => (
              <li key={fu.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <Link href={`/leads/${fu.leadId}`} className="font-medium hover:text-accent">
                    {fu.lead.name}
                  </Link>{" "}
                  <span className="text-xs text-muted">{fu.lead.waNumber} · jatuh tempo {fu.dueDate.toLocaleDateString("id-ID")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FollowUpTypeBadge type={fu.type} />
                  <LeadStatusBadge status={fu.lead.status} />
                  <WhatsAppLink waNumber={fu.lead.waNumber} message={waFollowUpMessage(fu.lead.name, fu.type)}>
                    WhatsApp
                  </WhatsAppLink>
                </div>
              </li>
            ))}
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
    </div>
  );
}
