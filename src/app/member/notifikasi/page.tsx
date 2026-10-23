import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationList } from "@/components/member/NotificationList";
import { PushSettings } from "@/components/member/PushSettings";

export default async function MemberNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { announcement: { select: { linkUrl: true, createdBy: { select: { name: true, role: true } } } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Olympus Lifting Club" title="Notifikasi" subtitle="Kabar terbaru untukmu dan pengumuman dari Olympus." />
      <PushSettings initialProgram={user.notifyProgram} />
      <NotificationList
        items={rows.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          url: n.url,
          announcementId: n.announcementId,
          linkUrl: n.announcement?.linkUrl ?? null,
          // Coaches sign their announcements; the front desk and owner speak as Olympus.
          from: n.announcement?.createdBy.role === "COACH" ? n.announcement.createdBy.name : null,
          read: n.readAt !== null,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
