"use client";

interface StepperInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  /** Decimal weights (2,5 kg steps) vs whole-number reps. */
  decimal?: boolean;
  placeholder?: string;
}

const btn =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-lg font-semibold text-muted transition hover:border-border-strong hover:text-foreground active:scale-95 disabled:opacity-40";

/** [−] value [+] number field: big tap targets so a set is logged one-handed. */
export function StepperInput({ label, value, onChange, step, decimal = false, placeholder }: StepperInputProps) {
  const current = Number(value.replace(",", "."));
  const numeric = Number.isFinite(current) ? current : 0;

  function bump(delta: number) {
    const next = Math.max(0, Math.round((numeric + delta) * 100) / 100);
    onChange(next > 0 ? String(next) : "");
  }

  return (
    <div className="min-w-0 flex-1">
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">{label}</label>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => bump(-step)} disabled={numeric <= 0} aria-label={`Kurangi ${label}`} className={btn}>
          −
        </button>
        <input
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="tabular h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-1 text-center text-lg font-semibold text-foreground shadow-card placeholder:text-sm placeholder:font-normal placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15"
        />
        <button type="button" onClick={() => bump(step)} aria-label={`Tambah ${label}`} className={btn}>
          +
        </button>
      </div>
    </div>
  );
}
