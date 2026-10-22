import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notify";
import { getClassSchedule } from "@/lib/classSchedule";
import { getThisWeekProgramRaw } from "@/lib/weekProgram";
import { matchesWeekday, weekdayLabelForDate } from "@/lib/programRotation";
import { todayDateKey } from "@/lib/workout";
import { Role } from "@/generated/prisma/client";

// Morning reminder (Vercel Cron, see vercel.json): today's program per
// coach, sent to members who left "Pengingat program pagi" on.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const key = todayDateKey();
  const weekday = key.getUTCDay();
  const weekdayLabel = weekdayLabelForDate(new Date(key.getUTCFullYear(), key.getUTCMonth(), key.getUTCDate()));

  const coaches = new Map<string, string>();
  for (const e of await getClassSchedule()) if (e.weekday === weekday && e.coach) coaches.set(e.coach.id, e.coach.name);
  if (coaches.size === 0) return NextResponse.json({ ok: true, skipped: "no classes today" });

  const parts: string[] = [];
  for (const [coachId, name] of coaches) {
    const { program } = await getThisWeekProgramRaw(coachId, weekdayLabel);
    const day = program?.days.find((d) => matchesWeekday(d.dayLabel, weekdayLabel));
    if (day) parts.push(`${name}: ${(day.focusLabel?.trim() || day.dayLabel).toUpperCase()}`);
  }
  if (parts.length === 0) return NextResponse.json({ ok: true, skipped: "no program today" });

  const members = await prisma.user.findMany({ where: { role: Role.MEMBER, notifyProgram: true }, select: { id: true } });
  await notifyUsers(
    members.map((m) => m.id),
    {
      type: "PROGRAM_TODAY",
      title: "🏋️ Program hari ini sudah siap",
      body: `${parts.join(" · ")}. Buka untuk lihat gerakan dan catat bebanmu.`,
      url: "/member/dashboard",
    }
  );
  return NextResponse.json({ ok: true, sent: members.length });
}
