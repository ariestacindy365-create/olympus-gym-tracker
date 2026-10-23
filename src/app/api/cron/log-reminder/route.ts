import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notify";
import { getClassSchedule } from "@/lib/classSchedule";
import { BACKFILL_DAYS, todayDateKey } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

const DAY_MS = 86_400_000;

// Evening reminder (Vercel Cron, 20:30 WIB, see vercel.json): members who
// were probably at the gym today but logged nothing. "Probably" = they had
// the app open during a class today, or they trained on this weekday in one
// of the last two weeks.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const today = todayDateKey();
  const schedule = await getClassSchedule();
  if (!schedule.some((e) => e.weekday === today.getUTCDay() && e.coach)) {
    return NextResponse.json({ ok: true, skipped: "no classes today" });
  }

  const sameWeekday = [new Date(today.getTime() - 7 * DAY_MS), new Date(today.getTime() - 14 * DAY_MS)];
  const [loggedToday, habit, present] = await Promise.all([
    prisma.setEntry.groupBy({ by: ["memberId"], where: { workoutDate: today } }),
    prisma.setEntry.groupBy({ by: ["memberId"], where: { workoutDate: { in: sameWeekday } } }),
    prisma.user.findMany({ where: { role: Role.MEMBER, presentDate: today }, select: { id: true } }),
  ]);
  const logged = new Set(loggedToday.map((r) => r.memberId));
  const candidates = new Set([...habit.map((r) => r.memberId), ...present.map((u) => u.id)].filter((id) => !logged.has(id)));
  if (candidates.size === 0) return NextResponse.json({ ok: true, sent: 0 });

  const members = await prisma.user.findMany({
    where: { id: { in: [...candidates] }, role: Role.MEMBER, notifyReminder: true },
    select: { id: true },
  });
  await notifyUsers(
    members.map((m) => m.id),
    {
      type: "LOG_REMINDER",
      title: "📝 Tadi latihan? Jangan lupa dicatat",
      body: `Catat set hari ini supaya progres dan rekormu terhitung. Kelupaan? Masih bisa diisi sampai ${BACKFILL_DAYS} hari ke belakang.`,
      url: "/member/dashboard",
    }
  );
  return NextResponse.json({ ok: true, sent: members.length });
}
