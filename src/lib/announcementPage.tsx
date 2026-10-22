import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnnouncementManager } from "@/components/shared/AnnouncementManager";
import { Role } from "@/generated/prisma/client";

/** Shared body of /coach/pengumuman and /leads/pengumuman. */
export async function AnnouncementPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [announcements, memberCount] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.user.count({ where: { role: Role.MEMBER } }),
  ]);
  const ids = announcements.map((a) => a.id);
  const [recipients, read] = await Promise.all([
    prisma.notification.groupBy({ by: ["announcementId"], where: { announcementId: { in: ids } }, _count: true }),
    prisma.notification.groupBy({ by: ["announcementId"], where: { announcementId: { in: ids }, readAt: { not: null } }, _count: true }),
  ]);
  const count = (rows: typeof recipients, id: string) => rows.find((r) => r.announcementId === id)?._count ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Pengumuman</h1>
        <p className="text-sm text-muted">Kirim pengumuman, promo, atau artikel ke semua member. Muncul di 🔔 aplikasi dan sebagai notifikasi HP.</p>
      </div>
      <AnnouncementManager
        memberCount={memberCount}
        canDeleteAll={user.role === Role.OWNER}
        sent={announcements.map((a) => ({
          id: a.id,
          category: a.category,
          title: a.title,
          body: a.body,
          linkUrl: a.linkUrl,
          author: a.createdBy.name,
          mine: a.createdById === user.id,
          createdAt: a.createdAt.toISOString(),
          recipients: count(recipients, a.id),
          read: count(read, a.id),
        }))}
      />
    </div>
  );
}
