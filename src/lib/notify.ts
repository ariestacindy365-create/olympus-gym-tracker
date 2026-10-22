import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/webPush";
import type { NotificationType } from "@/generated/prisma/client";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  announcementId?: string;
}

/**
 * Creates the in-app notification for each user and pushes it to their
 * phones. Call it from `after()` so the request doesn't wait on push
 * services; expired subscriptions are cleaned up as they're found.
 */
export async function notifyUsers(userIds: string[], n: NotificationInput) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: n.type,
      title: n.title,
      body: n.body,
      url: n.url ?? null,
      announcementId: n.announcementId ?? null,
    })),
  });

  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
  const payload = { title: n.title, body: n.body.slice(0, 180), url: n.url ?? "/member/notifikasi", tag: n.type };
  const results = await Promise.all(subs.map((s) => sendPush(s, payload).then((r) => [s.id, r] as const)));
  const gone = results.filter(([, r]) => r === "gone").map(([id]) => id);
  if (gone.length > 0) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
}
