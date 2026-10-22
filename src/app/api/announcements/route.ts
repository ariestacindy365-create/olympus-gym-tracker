import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notify";
import { ANNOUNCEMENT_CATEGORY } from "@/lib/announcements";
import { Role } from "@/generated/prisma/client";

// Announcements come from the front desk (admin), and the owner.
const STAFF: Role[] = [Role.ADMIN, Role.OWNER];

const schema = z.object({
  category: z.enum(["PENGUMUMAN", "PROMO", "ARTIKEL", "LAINNYA"]),
  title: z.string().trim().min(3, { error: "Judul minimal 3 huruf." }).max(100),
  body: z.string().trim().min(1, { error: "Tulis isinya dulu." }).max(3000),
  linkUrl: z.union([z.url({ error: "Link harus diawali https://" }), z.literal("")]).optional(),
});

// Admin/owner: send an announcement / promo / article to every member.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(user.role)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }
  const { category, title, body, linkUrl } = parsed.data;
  const announcement = await prisma.announcement.create({
    data: { category, title, body, linkUrl: linkUrl || null, createdById: user.id },
  });
  const members = await prisma.user.findMany({ where: { role: Role.MEMBER }, select: { id: true } });
  after(() =>
    notifyUsers(
      members.map((m) => m.id),
      {
        type: "ANNOUNCEMENT",
        title: `${ANNOUNCEMENT_CATEGORY[category].emoji} ${title}`,
        body,
        url: `/member/notifikasi#n-${announcement.id}`,
        announcementId: announcement.id,
      }
    )
  );
  return NextResponse.json({ announcement, recipients: members.length });
}
