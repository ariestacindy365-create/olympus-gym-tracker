import Link from "next/link";
import { differenceInCalendarDays, addDays } from "date-fns";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WhatsAppLink } from "@/components/leads/WhatsAppLink";
import { waFollowUpMessage } from "@/lib/waScripts";

export default async function RenewalsPage() {
  await requireAnyRole(["ADMIN", "OWNER"]);

  const today = todayDateKey();
  const horizon = addDays(today, 30);

  const activeMembers = await prisma.lead.findMany({
    where: { status: { in: ["MEMBER", "RETENSI"] }, deletedAt: null },
    include: {
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
      capturedBy: { select: { name: true } },
    },
  });

  // Only members whose latest payment has a known expiry date, and that
  // date falls within the next 30 days (including already-overdue ones,
  // which have no lower bound — those are the most urgent).
  const pipeline = activeMembers
    .map((lead) => ({ lead, expiresAt: lead.payments[0]?.expiresAt ?? null, packageName: lead.payments[0]?.packageName }))
    .filter((p): p is typeof p & { expiresAt: Date } => p.expiresAt !== null && p.expiresAt <= horizon)
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

  const overdueCount = pipeline.filter((p) => p.expiresAt < today).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Pipeline Perpanjangan</h1>
        <p className="text-sm text-muted">
          Member aktif yang masa paketnya berakhir dalam 30 hari ke depan, diurut dari yang paling mendesak.
        </p>
      </div>

      <Card>
        {pipeline.length === 0 ? (
          <p className="text-sm text-muted">Tidak ada member yang perlu diperpanjang dalam waktu dekat.</p>
        ) : (
          <>
            {overdueCount > 0 && (
              <p className="mb-3 text-sm font-medium text-danger">{overdueCount} member sudah lewat masa aktif.</p>
            )}
            <ul className="flex flex-col gap-3">
              {pipeline.map(({ lead, expiresAt, packageName }) => {
                const daysUntil = differenceInCalendarDays(expiresAt, today);
                const tone = daysUntil < 0 ? "danger" : daysUntil <= 7 ? "accent" : "muted";
                const label =
                  daysUntil < 0
                    ? `Terlambat ${Math.abs(daysUntil)} hari`
                    : daysUntil === 0
                      ? "Hari ini"
                      : `${daysUntil} hari lagi`;

                return (
                  <li
                    key={lead.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:text-accent">
                        {lead.name}
                      </Link>{" "}
                      <span className="text-xs text-muted">
                        {lead.waNumber} · {packageName} · berakhir {expiresAt.toLocaleDateString("id-ID")} · capture:{" "}
                        {lead.capturedBy.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={tone}>{label}</Badge>
                      <WhatsAppLink waNumber={lead.waNumber} message={waFollowUpMessage(lead.name, "H21")}>
                        WhatsApp
                      </WhatsAppLink>
                      <Link href={`/leads/payments?leadId=${lead.id}`}>
                        <Button variant="secondary" className="px-3 py-1.5 text-xs">
                          Catat Perpanjangan
                        </Button>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
