import { ClassTimer } from "@/components/shared/ClassTimer";

export default function CoachTimerPage() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">Timer Kelas</h1>
        <p className="text-sm text-muted">
          FOR TIME, AMRAP, EMOM, TABATA. Tekan Layar penuh untuk TV. Dari slideshow program, tombol ⏱ R1–R4 langsung
          mengisi timer sesuai skema round.
        </p>
      </div>
      <ClassTimer variant="page" />
    </div>
  );
}
