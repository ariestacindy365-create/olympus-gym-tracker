import Link from "next/link";
import { formatKg } from "@/lib/volumeStory";
import { CHALLENGE, type MonthlyChallenge } from "@/lib/challenge";

function Bar({ value, target }: { value: number; target: number }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${value >= target ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** "Challenge Oktober": the member's progress to this month's goals; `compact` for the dashboard. */
export function ChallengeCard({ challenge, compact = false }: { challenge: MonthlyChallenge; compact?: boolean }) {
  const { mine, finishers, daysLeft, monthLabel } = challenge;
  const done = mine.days >= CHALLENGE.days;
  const need = CHALLENGE.days - mine.days;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Challenge {monthLabel}</p>
          <p className="font-display text-xl font-bold">Latihan {CHALLENGE.days} hari bulan ini</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
          {daysLeft > 0 ? `${daysLeft} hari lagi` : "Hari terakhir"}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Bar value={mine.days} target={CHALLENGE.days} />
        <p className="text-sm">
          <b>
            {mine.days}/{CHALLENGE.days} hari
          </b>{" "}
          <span className="text-muted">
            {done ? "· Challenge selesai! 🎉" : need > daysLeft + 1 ? "· Bulan depan coba lagi ya" : `· kurang ${need} hari lagi`}
          </span>
        </p>
      </div>
      {!compact && (
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted">Bonus: angkat {formatKg(CHALLENGE.volume)} kg</p>
            <Bar value={mine.volume} target={CHALLENGE.volume} />
            <p className="text-xs font-semibold">{formatKg(mine.volume)} kg</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted">Bonus: {CHALLENGE.prs} rekor baru</p>
            <Bar value={mine.prs} target={CHALLENGE.prs} />
            <p className="text-xs font-semibold">{mine.prs} rekor 🏆</p>
          </div>
        </div>
      )}
      <p className="text-xs text-muted">
        {finishers.length === 0
          ? "Belum ada yang menyelesaikan challenge bulan ini. Jadi yang pertama!"
          : `🎉 ${finishers.length} member sudah selesai${compact ? "" : `: ${finishers.map((f) => f.name).join(", ")}`}.`}
        {compact && (
          <>
            {" "}
            <Link href="/member/feed?tab=peringkat" className="font-semibold text-accent hover:underline">
              Lihat challenge →
            </Link>
          </>
        )}
      </p>
    </section>
  );
}
