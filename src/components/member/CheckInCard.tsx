/** The member's check-in card: the front desk scans it when they arrive. */
export function CheckInCard({ code, qr, classes }: { code: string; qr: string; classes: string[] }) {
  return (
    <section className="flex items-center gap-4 rounded-2xl bg-nav-bg p-4 text-white shadow-raised" aria-label="Kartu check-in">
      {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made on the server */}
      <img src={qr} alt={`Kode check-in ${code}`} width={132} height={132} className="h-[132px] w-[132px] shrink-0 rounded-xl bg-white p-1.5" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-nav-muted">Kartu check-in</p>
        <p className="mt-1 font-display text-2xl font-bold tracking-wider">{code}</p>
        <p className="mt-1 text-sm text-white/75">
          {classes.length ? `Hari ini: ${classes.join(", ")}. ` : ""}Tunjukkan ke admin di meja depan saat datang.
        </p>
      </div>
    </section>
  );
}
