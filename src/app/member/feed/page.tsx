import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMonthlyLeaderboard } from "@/lib/leaderboard";
import { getFeed } from "@/lib/feed";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LeaderboardView } from "@/components/member/LeaderboardView";
import { LeaderboardOptOutToggle } from "@/components/member/LeaderboardOptOutToggle";
import { FeedView } from "@/components/member/FeedView";
import { getMonthlyChallenge } from "@/lib/challenge";
import { ChallengeCard } from "@/components/member/ChallengeCard";

export default async function MemberFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const tab = (await searchParams).tab === "peringkat" ? "peringkat" : "feed";

  const tabs = (
    <div className="flex rounded-xl bg-surface-2 p-1" role="tablist">
      {[
        { id: "feed", label: "Feed", href: "/member/feed" },
        { id: "peringkat", label: "Peringkat", href: "/member/feed?tab=peringkat" },
      ].map((t) => (
        <Link
          key={t.id}
          href={t.href}
          role="tab"
          aria-selected={tab === t.id}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
            tab === t.id ? "bg-surface text-foreground shadow-card" : "text-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );

  if (tab === "peringkat") {
    const [{ monthLabel, boards }, challenge] = await Promise.all([getMonthlyLeaderboard(), getMonthlyChallenge(user.id)]);
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          eyebrow={monthLabel}
          title="Peringkat Bulan Ini"
          subtitle="Tantangan antar member Olympus. Direset setiap awal bulan."
        />
        {tabs}
        <ChallengeCard challenge={challenge} />
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

  const posts = await getFeed(user);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Olympus Lifting Club" title="Feed" subtitle="Latihan member Olympus. Kasih 💪 dan semangat!" />
      {tabs}
      <FeedView posts={posts} />
    </div>
  );
}
