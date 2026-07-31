import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LeadStatusActions } from "@/components/leads/LeadStatusActions";
import { LeadHeader } from "@/components/leads/LeadHeader";
import { FollowUpActions } from "@/components/leads/FollowUpActions";
import { WhatsAppLink } from "@/components/leads/WhatsAppLink";
import {
  STATUS_LABEL,
  STATUS_TONE,
  FOLLOWUP_STATUS_LABEL,
  FOLLOWUP_TYPE_LABEL,
  FOLLOWUP_TYPE_TONE,
} from "@/lib/leadStatusLabels";
import { waOpeningMessage, waFollowUpMessage } from "@/lib/waScripts";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";
  const isOwner = user?.role === "OWNER";

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      capturedBy: { select: { name: true } },
      deletedBy: { select: { name: true } },
      followUps: {
        orderBy: { dueDate: "asc" },
        include: { completedBy: { select: { name: true } } },
      },
    },
  });

  if (!lead) notFound();
  const isDeleted = lead.deletedAt !== null;

  // Pick the most relevant script for the main WhatsApp button: whichever
  // follow-up is still pending, otherwise the DM opening line if we haven't
  // started talking yet.
  const nextPendingFollowUp = lead.followUps.find((fu) => fu.status === "PENDING");
  const waMessage = nextPendingFollowUp
    ? waFollowUpMessage(lead.name, nextPendingFollowUp.type)
    : lead.status === "DM"
      ? waOpeningMessage(lead.name)
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      {!isDeleted && (isAdmin || isOwner) ? (
        <LeadHeader
          leadId={lead.id}
          name={lead.name}
          waNumber={lead.waNumber}
          canEdit={isAdmin}
          canDelete={isOwner}
        />
      ) : (
        <div>
          <h1 className="font-display text-2xl font-bold">{lead.name}</h1>
          <p className="text-sm text-muted">{lead.waNumber}</p>
        </div>
      )}

      {isDeleted && (
        <Card className="border-danger/40 bg-danger/5">
          <p className="text-sm text-danger">
            Lead ini sudah dihapus pada {lead.deletedAt?.toLocaleDateString("id-ID")} oleh {lead.deletedBy?.name}.
          </p>
        </Card>
      )}

      <Card className="flex flex-wrap items-center gap-3">
        <Badge tone={STATUS_TONE[lead.status] ?? "default"}>{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
        <span className="text-xs text-muted">
          Dicapture oleh {lead.capturedBy.name} · {lead.capturedAt.toLocaleDateString("id-ID")}
        </span>
        {!isDeleted && (
          <WhatsAppLink waNumber={lead.waNumber} message={waMessage}>
            Follow Up via WhatsApp
          </WhatsAppLink>
        )}
      </Card>

      {isAdmin && !isDeleted && <LeadStatusActions leadId={lead.id} status={lead.status} />}

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Follow Up</h2>
        {lead.followUps.length === 0 ? (
          <p className="text-sm text-muted">Belum ada follow up terjadwal.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {lead.followUps.map((fu) => (
              <li key={fu.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    <Badge tone={FOLLOWUP_TYPE_TONE[fu.type] ?? "default"}>{FOLLOWUP_TYPE_LABEL[fu.type] ?? fu.type}</Badge>{" "}
                    {fu.dueDate.toLocaleDateString("id-ID")}
                  </span>
                  <Badge tone={fu.status === "DONE" ? "success" : "muted"}>
                    {FOLLOWUP_STATUS_LABEL[fu.status] ?? fu.status}
                  </Badge>
                </div>
                {fu.status === "PENDING" && isAdmin && !isDeleted && <FollowUpActions followUpId={fu.id} />}
                {fu.status === "DONE" && (
                  <p className="mt-1 text-xs text-muted">
                    Oleh {fu.completedBy?.name} · {fu.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
