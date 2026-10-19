import { getCurrentUser } from "@/lib/auth";
import { getMonthlyLeaderboard } from "@/lib/leaderboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LeaderboardView } from "@/components/member/LeaderboardView";
import { LeaderboardOptOutToggle } from "@/components/member/LeaderboardOptOutToggle";

export default async function MemberLeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { monthLabel, boards } = await getMonthlyLeaderboard();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={monthLabel}
        title="Peringkat Bulan Ini"
        subtitle="Tantangan antar member Olympus. Direset setiap awal bulan."
      />
      {user.leaderboardOptOut && (
        <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
          Kamu sedang disembunyikan dari peringkat.
        </p>
      )}
      <LeaderboardView boards={boards} currentMemberId={user.id} />
      <Card>
        <LeaderboardOptOutToggle initialOptOut={user.leaderboardOptOut} />
      </Card>
    </div>
  );
}
