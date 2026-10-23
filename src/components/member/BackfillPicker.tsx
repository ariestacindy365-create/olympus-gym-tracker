import Link from "next/link";

function label(date: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", { ...opts, timeZone: "UTC" });
}

/** "Lupa catat?": the last few days a member can still fill in, with how many sets each already has. */
export function BackfillPicker({ days, active }: { days: { date: string; sets: number }[]; active: string | null }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <p className="font-semibold">📅 Lupa catat latihan?</p>
      <p className="text-xs text-muted">Latihan masih bisa diisi sampai {days.length} hari ke belakang.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {days.map((d, i) => (
          <Link
            key={d.date}
            href={`/member/dashboard?tgl=${d.date}`}
            aria-current={d.date === active ? "page" : undefined}
            className={`flex flex-col items-center rounded-xl border px-2 py-2 text-center transition ${
              d.date === active ? "border-accent bg-accent/10" : "border-border bg-surface-2 hover:border-accent"
            }`}
          >
            <span className="text-[11px] font-semibold uppercase text-muted">{i === 0 ? "Kemarin" : label(d.date, { weekday: "long" })}</span>
            <span className="font-display text-lg font-bold leading-tight">{label(d.date, { day: "numeric", month: "short" })}</span>
            <span className={`text-[11px] font-semibold ${d.sets ? "text-success" : "text-muted"}`}>
              {d.sets ? `✓ ${d.sets} set` : "Belum diisi"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
