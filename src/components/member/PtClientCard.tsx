import { Card } from "@/components/ui/Card";

/** Member side: "Klien PT kamu" — who trains them, with whom, and today's session. */
export function PtClientCard({
  coachName,
  partners,
  sessionsDone,
  today,
  schedule,
}: {
  coachName: string;
  partners: string[];
  sessionsDone: number;
  /** The session up next; `laterOn` when the coach scheduled it for a later day. */
  today: { number: number; title: string | null; laterOn?: string | null } | null;
  /** Upcoming sessions the coach scheduled, soonest first. */
  schedule: { number: number; title: string | null; today: boolean; label: string }[];
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">🏋️ Klien PT kamu</h2>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">PT</span>
      </div>
      <p className="text-sm">
        Dilatih <span className="font-semibold">{coachName}</span>
        {partners.length > 0 && (
          <>
            {" "}
            bareng <span className="font-semibold">{partners.join(", ")}</span>
          </>
        )}
        . {sessionsDone} sesi selesai.
      </p>
      <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
        {today ? (
          today.laterOn ? (
            <>
              Sesi berikutnya: <span className="font-semibold">Sesi {today.number}</span>
              {today.title && ` · ${today.title}`}, dijadwalkan <span className="font-semibold">{today.laterOn}</span>. Kalau latihannya hari ini,
              catat setnya di bawah.
            </>
          ) : (
            <>
              Hari ini: <span className="font-semibold">Sesi {today.number}</span>
              {today.title && ` · ${today.title}`}. Catat setnya di bawah.
            </>
          )
        ) : (
          "Coach belum menulis sesi berikutnya. Kamu tetap bisa mencatat latihan sendiri di bawah."
        )}
      </p>
      {schedule.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">📅 Jadwal dari coach</p>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {schedule.map((s) => (
              <li key={s.number} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                <span>
                  <span className="font-semibold">Sesi {s.number}</span>
                  {s.title && <span className="text-muted"> · {s.title}</span>}
                </span>
                <span className={`shrink-0 text-right ${s.today ? "font-semibold text-accent" : "text-muted"}`}>{s.today ? `Hari ini${s.label.includes("·") ? ` · ${s.label.split("· ")[1]}` : ""}` : s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
