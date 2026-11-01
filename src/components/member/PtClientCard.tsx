import { Card } from "@/components/ui/Card";

/** Member side: "Klien PT kamu" — who trains them, with whom, and today's session. */
export function PtClientCard({
  coachName,
  partners,
  sessionsDone,
  today,
}: {
  coachName: string;
  partners: string[];
  sessionsDone: number;
  today: { number: number; title: string | null } | null;
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
          <>
            Hari ini: <span className="font-semibold">Sesi {today.number}</span>
            {today.title && ` · ${today.title}`}. Catat setnya di bawah.
          </>
        ) : (
          "Coach belum menulis sesi berikutnya. Kamu tetap bisa mencatat latihan sendiri di bawah."
        )}
      </p>
    </Card>
  );
}
