import { getCurrentUser } from "@/lib/auth";
import { syncMemberAchievements, getMemberAchievements, ACHIEVEMENTS, type Achievement } from "@/lib/achievements";
import { Emblem } from "@/components/shared/Emblem";
import { SERIES_STORY, TIER_LABEL, emblemFor, type EmblemTier } from "@/lib/emblems";

const CATEGORY_LABELS: Record<Achievement["category"], string> = {
  KONSISTENSI: "Konsistensi",
  KEKUATAN: "Kekuatan",
  VOLUME: "Volume",
  BODY: "Body Metrics",
  LOYALITAS: "Loyalitas",
};

const CATEGORY_ORDER: Achievement["category"][] = ["KONSISTENSI", "KEKUATAN", "VOLUME", "BODY", "LOYALITAS"];

const TIER_PILL: Record<EmblemTier, string> = {
  bronze: "bg-[#c27a3f]/15 text-[#a15f2c]",
  silver: "bg-slate-400/20 text-slate-600 dark:text-slate-300",
  gold: "bg-[#f2c230]/20 text-[#9a6a06] dark:text-[#f2c230]",
  olympian: "bg-accent/15 text-accent",
};

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatStatValue(value: number) {
  return Number.isInteger(value) ? value.toLocaleString("id-ID") : value.toFixed(1);
}

function formatProgress(achievement: Achievement, currentValue: number): string {
  if (achievement.statKey === "bodyweightMultiple") {
    return `${Math.round(currentValue * 100)}% dari berat badan`;
  }
  return `${formatStatValue(currentValue)}/${formatStatValue(achievement.threshold)}`;
}

export default async function MemberAchievementsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Backfill pass: members with pre-existing history (e.g. imported
  // progress data) should see everything they already qualify for the
  // first time they open this page, not just achievements earned from now on.
  await syncMemberAchievements(user.id);
  const { unlocked, stats } = await getMemberAchievements(user.id);
  const unlockedCodes = new Set(unlocked.map((a) => a.code));
  const unlockedAtByCode = new Map(unlocked.map((a) => [a.code, a.unlockedAt]));

  const progressOf = (a: Achievement) => Math.min(1, stats[a.statKey] / a.threshold);
  // The locked emblem closest to unlocking — the member's next goal.
  const next = ACHIEVEMENTS.filter((a) => !unlockedCodes.has(a.code)).sort((a, b) => progressOf(b) - progressOf(a))[0];
  const olympianCount = unlocked.filter((a) => emblemFor(a.code).tier === "olympian").length;

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl bg-nav-bg px-5 py-6 text-white shadow-raised [background-image:radial-gradient(40rem_16rem_at_50%_0%,rgb(37_99_235/0.45),transparent)]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-nav-muted">Pantheon Olympus</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Emblem Kamu</h1>
        <p className="mt-1 max-w-prose text-sm text-white/70">
          Setiap emblem membawa simbol dewa Olympus. Naik dari Perunggu, Perak, Emas, sampai puncak: <b>Olympian</b>.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span>
            <b className="font-display text-2xl">{unlocked.length}</b>
            <span className="text-white/60"> / {ACHIEVEMENTS.length} emblem</span>
          </span>
          <span>
            <b className="font-display text-2xl text-[#93c5fd]">{olympianCount}</b>
            <span className="text-white/60"> Olympian</span>
          </span>
          <span>
            <b className="font-display text-2xl">{formatStatValue(stats.distinctTrainingDays)}</b>
            <span className="text-white/60"> hari latihan</span>
          </span>
        </div>

        {next && (
          <div className="mt-5 flex items-center gap-4 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <Emblem code={next.code} size={64} locked progress={progressOf(next)} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-nav-muted">Target berikutnya</p>
              <p className="font-display text-lg font-bold">{next.name}</p>
              <p className="text-xs text-white/70">
                {next.description} · {formatProgress(next, stats[next.statKey])}
              </p>
            </div>
          </div>
        )}
      </section>

      {CATEGORY_ORDER.map((category) => {
        const items = ACHIEVEMENTS.filter((a) => a.category === category);
        const glyphs = [...new Set(items.map((a) => emblemFor(a.code).glyph))];
        return (
          <section key={category} className="flex flex-col gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">{CATEGORY_LABELS[category]}</h2>
              {glyphs.map((g) => (
                <p key={g} className="text-xs text-muted">
                  {SERIES_STORY[g]}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((achievement) => {
                const isUnlocked = unlockedCodes.has(achievement.code);
                const currentValue = stats[achievement.statKey];
                const progress = progressOf(achievement);
                const style = emblemFor(achievement.code);

                return (
                  <div
                    key={achievement.code}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 pb-4 pt-3 text-center ${
                      isUnlocked ? "border-border bg-surface shadow-card" : "border-dashed border-border bg-surface-2/60"
                    }`}
                  >
                    <Emblem code={achievement.code} size={96} locked={!isUnlocked} progress={progress} />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isUnlocked ? TIER_PILL[style.tier] : "bg-border text-muted"}`}>
                      {TIER_LABEL[style.tier]}
                    </span>
                    <p className={`font-display text-sm font-bold leading-tight ${isUnlocked ? "text-foreground" : "text-muted"}`}>
                      {achievement.name}
                    </p>
                    <p className="text-[11px] leading-snug text-muted">{achievement.description}</p>
                    {isUnlocked ? (
                      <p className="text-[11px] font-medium text-success">✓ {formatDate(unlockedAtByCode.get(achievement.code)!)}</p>
                    ) : (
                      <p className="text-[11px] font-semibold text-accent">{formatProgress(achievement, currentValue)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
