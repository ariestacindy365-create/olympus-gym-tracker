import { addDays } from "date-fns";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { TargetEditForm } from "@/components/leads/TargetEditForm";
import { Role } from "@/generated/prisma/client";

export default async function LeadsOwnerPage() {
  await requireRole("OWNER");

  const today = todayDateKey();
  const tomorrow = addDays(today, 1);

  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, orderBy: { name: "asc" } });

  const adminStats = await Promise.all(
    admins.map(async (admin) => {
      const [target, capturesToday, followUpsDoneToday, qualifiedCount, convertedCount] = await Promise.all([
        prisma.target.findUnique({ where: { adminId: admin.id } }),
        prisma.lead.count({ where: { capturedById: admin.id, capturedAt: { gte: today, lt: tomorrow } } }),
        prisma.followUp.count({ where: { completedById: admin.id, completedAt: { gte: today, lt: tomorrow } } }),
        prisma.lead.count({ where: { capturedById: admin.id, replyCount: { gte: 2 } } }),
        prisma.lead.count({ where: { capturedById: admin.id, status: "MEMBER" } }),
      ]);
      return { admin, target, capturesToday, followUpsDoneToday, qualifiedCount, convertedCount };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Overview Admin</h1>

      {adminStats.map(({ admin, target, capturesToday, followUpsDoneToday, qualifiedCount, convertedCount }) => (
        <Card key={admin.id} className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">{admin.name}</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Capture Hari Ini"
              value={`${capturesToday}/${target?.targetCapture ?? 0}`}
              accent={capturesToday >= (target?.targetCapture ?? 0)}
            />
            <StatTile
              label="Follow Up Hari Ini"
              value={`${followUpsDoneToday}/${target?.targetFollowup ?? 0}`}
              accent={followUpsDoneToday >= (target?.targetFollowup ?? 0)}
            />
            <StatTile label="Total Qualified" value={qualifiedCount} />
            <StatTile label="Total Member" value={convertedCount} />
          </div>

          <TargetEditForm
            adminId={admin.id}
            targetCapture={target?.targetCapture ?? 5}
            targetFollowup={target?.targetFollowup ?? 10}
          />
        </Card>
      ))}
    </div>
  );
}
