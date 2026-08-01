import Link from "next/link";
import { addDays } from "date-fns";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { getTodayDueFollowUps } from "@/lib/leads";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CaptureLeadForm } from "@/components/leads/CaptureLeadForm";
import { FollowUpActions } from "@/components/leads/FollowUpActions";
import { WhatsAppLink } from "@/components/leads/WhatsAppLink";
import { waFollowUpMessage } from "@/lib/waScripts";
import { FOLLOWUP_TYPE_LABEL, FOLLOWUP_TYPE_TONE } from "@/lib/leadStatusLabels";

export default async function LeadsDashboardPage() {
  const admin = await requireRole("ADMIN");

  const today = todayDateKey();
  const tomorrow = addDays(today, 1);

  const [target, capturesToday, followUpsDoneToday, dueFollowUps] = await Promise.all([
    prisma.target.findUnique({ where: { adminId: admin.id } }),
    prisma.lead.count({
      where: { capturedById: admin.id, capturedAt: { gte: today, lt: tomorrow }, deletedAt: null },
    }),
    prisma.followUp.count({
      where: { completedById: admin.id, completedAt: { gte: today, lt: tomorrow } },
    }),
    getTodayDueFollowUps(admin.id),
  ]);

  const targetCapture = target?.targetCapture ?? 5;
  const targetFollowup = target?.targetFollowup ?? 10;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Dashboard — {admin.name}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Capture Hari Ini" value={`${capturesToday}/${targetCapture}`} accent={capturesToday >= targetCapture} />
        <StatTile
          label="Follow Up Hari Ini"
          value={`${followUpsDoneToday}/${targetFollowup}`}
          accent={followUpsDoneToday >= targetFollowup}
        />
        <StatTile label="Follow Up Menunggu" value={dueFollowUps.length} />
      </div>

      <CaptureLeadForm />

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Follow Up Hari Ini</h2>
        {dueFollowUps.length === 0 ? (
          <p className="text-sm text-muted">Tidak ada follow up yang jatuh tempo hari ini.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {dueFollowUps.map((fu) => (
              <li key={fu.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/leads/${fu.leadId}`} className="font-medium hover:text-accent">
                      {fu.lead.name}
                    </Link>{" "}
                    <span className="text-sm text-muted">{fu.lead.waNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={FOLLOWUP_TYPE_TONE[fu.type] ?? "default"}>{FOLLOWUP_TYPE_LABEL[fu.type] ?? fu.type}</Badge>
                    <WhatsAppLink waNumber={fu.lead.waNumber} message={waFollowUpMessage(fu.lead.name, fu.type)}>
                      WhatsApp
                    </WhatsAppLink>
                  </div>
                </div>
                <FollowUpActions followUpId={fu.id} leadStatus={fu.lead.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
