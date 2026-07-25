import { getCurrentUser } from "@/lib/auth";
import { syncMemberAchievements, getMemberAchievements, ACHIEVEMENTS, type Achievement } from "@/lib/achievements";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";

const CATEGORY_LABELS: Record<Achievement["category"], string> = {
  KONSISTENSI: "Konsistensi",
  KEKUATAN: "Kekuatan",
  VOLUME: "Volume",
  BODY: "Body Metrics",
};

const CATEGORY_ORDER: Achievement["category"][] = ["KONSISTENSI", "KEKUATAN", "VOLUME", "BODY"];

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatStatValue(value: number) {
  return Number.isInteger(value) ? value.toLocaleString("id-ID") : value.toFixed(1);
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Achievement</h1>
        <p className="text-sm text-muted">Kumpulkan emblem dengan mencapai target latihan dan progress badanmu.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Emblem Didapat" value={`${unlocked.length}/${ACHIEVEMENTS.length}`} accent />
        <StatTile label="Hari Latihan" value={formatStatValue(stats.distinctTrainingDays)} />
        <StatTile label="Personal Record" value={formatStatValue(stats.totalPRs)} />
        <StatTile label="Total Angkatan" value={`${formatStatValue(stats.totalVolumeKg)}kg`} />
      </div>

      {CATEGORY_ORDER.map((category) => {
        const items = ACHIEVEMENTS.filter((a) => a.category === category);
        return (
          <Card key={category}>
            <h2 className="mb-3 font-display text-lg font-semibold">{CATEGORY_LABELS[category]}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((achievement) => {
                const isUnlocked = unlockedCodes.has(achievement.code);
                const currentValue = stats[achievement.statKey];
                const progress = Math.min(1, currentValue / achievement.threshold);

                return (
                  <div
                    key={achievement.code}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                      isUnlocked ? "border-accent bg-accent/5" : "border-border bg-surface-2"
                    }`}
                  >
                    <span className={`text-3xl leading-none ${isUnlocked ? "" : "opacity-30 grayscale"}`}>
                      {achievement.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-display text-sm font-bold ${isUnlocked ? "text-accent" : "text-foreground"}`}>
                        {achievement.name}
                      </p>
                      <p className="text-xs text-muted">{achievement.description}</p>
                      {isUnlocked ? (
                        <p className="mt-1 text-xs text-muted">
                          Didapat {formatDate(unlockedAtByCode.get(achievement.code)!)}
                        </p>
                      ) : (
                        <div className="mt-2">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${progress * 100}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {formatStatValue(currentValue)}/{formatStatValue(achievement.threshold)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
