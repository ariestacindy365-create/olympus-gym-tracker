import { prisma } from "@/lib/prisma";
import { isOnline } from "@/lib/status";
import { todayDateKey } from "@/lib/workout";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { Role } from "@/generated/prisma/client";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { todayLabel } from "@/lib/dateLabel";
import { SlideShowButton } from "@/components/coach/SlideShowButton";
import { getThisWeekProgram } from "@/lib/weekProgram";
import { formatRecord } from "@/lib/setUnits";
import { getClassRecap } from "@/lib/classRecap";
import { ClassRecap } from "@/components/coach/ClassRecap";

// Members who haven't logged a set for this many days show up under
// "Perlu Disapa" so a coach can reach out before they drop off.
const INACTIVE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function CoachDashboardPage() {
  const [coach, members, todaysSets, recentPRs, lastSets, thisWeek] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({ where: { role: Role.MEMBER }, select: { id: true, name: true, createdAt: true, lastActiveAt: true } }),
    prisma.setEntry.findMany({
      where: { workoutDate: todayDateKey() },
      select: { memberId: true },
    }),
    prisma.personalRecord.findMany({
      orderBy: { achievedAt: "desc" },
      take: 5,
      include: { member: { select: { name: true } }, exercise: true },
    }),
    prisma.setEntry.groupBy({ by: ["memberId"], _max: { workoutDate: true } }),
    getCurrentUser().then((u) => getThisWeekProgram(u?.id ?? null)),
  ]);
  const recap = coach ? await getClassRecap(coach.id) : [];

  const today = todayDateKey();
  const lastByMember = new Map(lastSets.map((l) => [l.memberId, l._max.workoutDate]));
  const inactive = members
    .map((m) => {
      const last = lastByMember.get(m.id) ?? null;
      // Never logged: count from when the account was made.
      const since = last ?? m.createdAt;
      return { id: m.id, name: m.name, last, days: Math.floor((today.getTime() - since.getTime()) / DAY_MS) };
    })
    .filter((m) => m.days >= INACTIVE_DAYS)
    .sort((a, b) => b.days - a.days);

  const loggedMemberIds = new Set(todaysSets.map((t) => t.memberId));
  const onlineCount = members.filter((m) => isOnline(m.lastActiveAt)).length;

  const inactiveRow = (m: (typeof inactive)[number]) => (
    <li key={m.id}>
      <Link
        href={`/coach/members/${m.id}`}
        className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm transition hover:bg-accent/10"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{m.name}</span>
          <span className="text-xs text-muted">
            {m.last
              ? `Terakhir latihan ${m.last.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })}`
              : "Belum pernah mencatat latihan"}
          </span>
        </span>
        <span className={`tabular shrink-0 text-xs font-semibold ${m.days >= 30 ? "text-danger" : "text-warning"}`}>
          {m.days} hari
        </span>
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={todayLabel()}
        title={coach ? `Halo, ${/^coach\b/i.test(coach.name) ? coach.name : `Coach ${coach.name}`}` : "Coach Dashboard"}
        subtitle="Pantau member yang sedang latihan dan yang mulai jarang datang."
        actions={
          <div className="flex flex-wrap gap-2">
          <SlideShowButton slides={thisWeek.days} label="▶ Slideshow Program" />
          <Link
            href="/coach/board"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/25 transition hover:bg-accent-2"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" aria-hidden />
            Buka Live Board
          </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile label="Total Member" value={members.length} />
        <StatTile label="Online" value={onlineCount} accent />
        <StatTile
          label="Sudah Catat"
          value={`${loggedMemberIds.size}/${members.length}`}
          accent
          progress={{ current: loggedMemberIds.size, target: members.length }}
        />
        <StatTile label="Belum Catat" value={members.length - loggedMemberIds.size} />
      </div>

      {recap.length > 0 && (
        <Card>
          <div className="mb-3">
            <h2 className="font-display text-lg font-semibold">Rekap Kelas Hari Ini</h2>
            <p className="text-xs text-muted">Siapa yang latihan di kelasmu, rekornya, dan 💪 atau catatan untuk semua sekaligus.</p>
          </div>
          <ClassRecap classes={recap} />
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Perlu Disapa</h2>
            <p className="text-xs text-muted">Member yang tidak mencatat latihan {INACTIVE_DAYS} hari atau lebih.</p>
          </div>
          {inactive.length > 0 && (
            <span className="shrink-0 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">
              {inactive.length} member
            </span>
          )}
        </div>
        {inactive.length === 0 ? (
          <p className="text-sm text-muted">Semua member aktif latihan dalam {INACTIVE_DAYS} hari terakhir. 💪</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {inactive.slice(0, 15).map(inactiveRow)}
            {inactive.length > 15 && (
              <li>
                {/* No JS needed: the rest of the list opens in place. */}
                <details className="group">
                  <summary className="cursor-pointer list-none py-1 text-center text-xs font-semibold text-accent hover:underline [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">+{inactive.length - 15} member lainnya</span>
                    <span className="hidden group-open:inline">Sembunyikan</span>
                  </summary>
                  <ul className="mt-2 flex flex-col gap-2">{inactive.slice(15).map(inactiveRow)}</ul>
                </details>
              </li>
            )}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Rekor Terbaru Klub</h2>
        {recentPRs.length === 0 ? (
          <p className="text-sm text-muted">Belum ada rekor yang tercatat.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentPRs.map((pr) => (
              <li key={pr.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{pr.member.name}</span>{" "}
                  <span className="text-muted">- {pr.exercise.name}</span>
                </span>
                <span className="tabular shrink-0 font-semibold text-accent">
                  {formatRecord(pr)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
