import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// Withdraws an announcement: it disappears from every member's notifications.
export async function DELETE(_req: Request, ctx: RouteContext<"/api/announcements/[announcementId]">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { announcementId } = await ctx.params;
  const a = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!a) return NextResponse.json({ error: "Pengumuman tidak ditemukan." }, { status: 404 });
  // The owner can withdraw anyone's; others only their own.
  if (a.createdById !== user.id && user.role !== Role.OWNER) {
    return NextResponse.json({ error: "Hanya pembuatnya yang bisa menghapus." }, { status: 403 });
  }
  await prisma.announcement.delete({ where: { id: announcementId } });
  return NextResponse.json({ ok: true });
}
