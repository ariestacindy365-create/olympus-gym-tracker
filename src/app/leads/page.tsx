import { prisma } from "@/lib/prisma";
import { LeadListView, type LeadRow } from "@/components/leads/LeadListView";

export default async function LeadsListPage() {
  const leads = await prisma.lead.findMany({
    include: { capturedBy: { select: { name: true } } },
    orderBy: { capturedAt: "desc" },
  });

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    waNumber: l.waNumber,
    name: l.name,
    status: l.status,
    replyCount: l.replyCount,
    capturedByName: l.capturedBy.name,
    capturedAt: l.capturedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Semua Lead</h1>
      <LeadListView leads={rows} />
    </div>
  );
}
