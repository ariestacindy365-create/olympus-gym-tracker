import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReplyButton } from "@/components/leads/ReplyButton";
import { TrialForm } from "@/components/leads/TrialForm";
import { TrialOutcomeForm } from "@/components/leads/TrialOutcomeForm";
import { FollowUpActions } from "@/components/leads/FollowUpActions";

const STATUS_LABEL: Record<string, string> = {
  NEW: "Baru",
  CONTACTED: "Dihubungi",
  QUALIFIED: "Qualified",
  TRIAL: "Trial",
  CONVERTED: "Member",
  LOST: "Tidak Lanjut",
};

const FOLLOWUP_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu",
  DONE: "Selesai",
  MISSED: "Terlewat",
};

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      capturedBy: { select: { name: true } },
      trials: { orderBy: { createdAt: "desc" } },
      followUps: {
        orderBy: { dueDate: "asc" },
        include: { completedBy: { select: { name: true } } },
      },
    },
  });

  if (!lead) notFound();

  const openTrial = lead.trials.find((t) => t.converted === null);
  const canOfferTrial = isAdmin && !openTrial && lead.status !== "CONVERTED" && lead.status !== "LOST";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{lead.name}</h1>
        <p className="text-sm text-muted">{lead.waNumber}</p>
      </div>

      <Card className="flex flex-wrap items-center gap-3">
        <Badge tone="default">{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
        <Badge tone={lead.replyCount >= 2 ? "accent" : "muted"}>{lead.replyCount}x balasan</Badge>
        <span className="text-xs text-muted">
          Dicapture oleh {lead.capturedBy.name} · {lead.capturedAt.toLocaleDateString("id-ID")}
        </span>
        {isAdmin && <ReplyButton leadId={lead.id} />}
      </Card>

      {openTrial ? (
        isAdmin && (
          <TrialOutcomeForm trialId={openTrial.id} endDateLabel={openTrial.endDate.toLocaleDateString("id-ID")} />
        )
      ) : (
        canOfferTrial && <TrialForm leadId={lead.id} />
      )}

      {lead.trials.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Riwayat Trial</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {lead.trials.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                <span>
                  {t.startDate.toLocaleDateString("id-ID")} – {t.endDate.toLocaleDateString("id-ID")}
                </span>
                {t.converted === null ? (
                  <Badge tone="muted">Menunggu hasil</Badge>
                ) : t.converted ? (
                  <Badge tone="success">Konversi{t.discountGiven ? " (diskon)" : ""}</Badge>
                ) : (
                  <Badge tone="danger">Belum konversi</Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

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
                    <Badge tone={fu.type === "H1" ? "accent" : "danger"}>{fu.type === "H1" ? "H+1" : "H+3"}</Badge>{" "}
                    {fu.dueDate.toLocaleDateString("id-ID")}
                  </span>
                  <Badge tone={fu.status === "DONE" ? "success" : "muted"}>
                    {FOLLOWUP_STATUS_LABEL[fu.status] ?? fu.status}
                  </Badge>
                </div>
                {fu.status === "PENDING" && isAdmin && <FollowUpActions followUpId={fu.id} />}
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
