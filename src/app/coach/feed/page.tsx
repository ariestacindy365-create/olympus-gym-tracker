import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getFeed } from "@/lib/feed";
import { FeedView } from "@/components/member/FeedView";

export default async function CoachFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const coach = await getCurrentUser();
  if (!coach) return null;
  const mine = (await searchParams).kelas === "saya";
  const posts = await getFeed(coach, 50, mine ? coach.name : undefined);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Feed Member</h1>
        <p className="text-sm text-muted">
          Latihan yang disimpan member, termasuk yang dibagikan &quot;Hanya pelatih&quot;. Kasih 💪 atau komentar untuk
          menyemangati.
        </p>
      </div>
      <div className="flex rounded-xl bg-surface-2 p-1" role="tablist">
        {[
          { id: false, label: "Semua", href: "/coach/feed" },
          { id: true, label: "Kelasku", href: "/coach/feed?kelas=saya" },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            role="tab"
            aria-selected={mine === t.id}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
              mine === t.id ? "bg-surface text-foreground shadow-card" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <FeedView
        posts={posts}
        emptyText={mine ? "Belum ada latihan dari kelasmu yang disimpan member." : "Belum ada latihan yang disimpan member."}
      />
    </div>
  );
}
