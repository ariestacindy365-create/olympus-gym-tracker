// Shown on the new features while they're being tried out. Remove the
// <TrialNotice /> uses (or set TRIAL to false) once they're settled.
export const TRIAL = true;

/** "Uji coba" note: the feature is new, and the desk can help if something's off. */
export function TrialNotice({ what }: { what: string }) {
  if (!TRIAL) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm">
      <span className="mt-0.5 shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-900">Uji coba</span>
      <p>
        {what} sedang dalam masa uji coba. Kalau ada kendala, hubungi admin Olympus ya.
      </p>
    </div>
  );
}
