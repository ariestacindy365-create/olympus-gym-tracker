"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UNIT_LABEL, UNIT_MAX, type SetUnit } from "@/lib/setUnits";

export function SetFields({ weight, amount, unit, perSide, showWeight, disabled, onWeight, onAmount, onUnit, onPerSide, onOpenWeight }: {
  weight: string; amount: string; unit: SetUnit; perSide: boolean; showWeight: boolean; disabled?: boolean;
  onWeight: (value: string) => void; onAmount: (value: string) => void;
  onUnit: (value: SetUnit) => void; onPerSide: (value: boolean) => void; onOpenWeight: () => void;
}) {
  return <fieldset disabled={disabled} className="space-y-3">
    <label className="block text-sm font-medium">Satuan<Select value={unit} onChange={(event) => onUnit(event.target.value as SetUnit)} className="mt-1">{Object.entries(UNIT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
    <div className="grid grid-cols-2 gap-3">
      {showWeight ? <label className="text-sm font-medium">Beban (kg)<Input className="mt-1" inputMode="decimal" value={weight} onChange={(event) => onWeight(event.target.value)} placeholder="0 untuk tanpa beban" required /></label> : <button type="button" onClick={onOpenWeight} className="flex min-h-11 flex-col items-center justify-center self-end rounded-lg border border-dashed border-border py-2 text-xs text-muted"><span>Tanpa beban</span><span className="font-semibold text-accent">+ kg</span></button>}
      <label className="text-sm font-medium">Jumlah ({UNIT_LABEL[unit]})<Input className="mt-1" type="number" inputMode="numeric" step={1} min={1} max={UNIT_MAX[unit]} value={amount} onChange={(event) => onAmount(event.target.value)} required /></label>
    </div>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={perSide} onChange={(event) => onPerSide(event.target.checked)} />Tiap sisi (jumlah diisi per sisi)</label>
  </fieldset>;
}
