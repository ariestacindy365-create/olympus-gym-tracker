"use client";

import { useState } from "react";
import {
  SCHEME_DEFAULTS,
  SCHEME_KINDS,
  formatScheme,
  parseScheme,
  schemeLine,
  schemeUsesSets,
  type SchemeKind,
} from "@/lib/roundScheme";

interface RoundSchemeRowProps {
  roundNumber: number;
  /** The round's first slot's roundScheme / sets. */
  scheme: string;
  sets: string;
  onChange: (patch: { roundScheme?: string; sets?: string }) => void;
}

const numInput =
  "w-14 rounded border border-border bg-surface px-1.5 py-1 text-center text-sm font-semibold text-foreground focus:border-accent focus:outline-none";

/**
 * Header row above each round in the program table: pick the scheme
 * (E?MOM + sets, AMRAP ? min, TABATA ? SECTION, FOR TIME, or free text)
 * and see the line exactly as it will show on the slide.
 */
export function RoundSchemeRow({ roundNumber, scheme, sets, onChange }: RoundSchemeRowProps) {
  const initial = parseScheme(scheme);
  const [kind, setKind] = useState<SchemeKind>(initial.kind);
  const [value, setValue] = useState(initial.value);
  const [custom, setCustom] = useState(initial.custom);

  function emit(next: { kind?: SchemeKind; value?: string; custom?: string }) {
    const k = next.kind ?? kind;
    const v = next.value ?? value;
    const c = next.custom ?? custom;
    onChange({ roundScheme: formatScheme({ kind: k, value: v || SCHEME_DEFAULTS[k], custom: c }) });
  }

  function pickKind(k: SchemeKind) {
    const v = k === kind ? value : SCHEME_DEFAULTS[k];
    setKind(k);
    setValue(v);
    emit({ kind: k, value: v });
    // A fresh EMOM round defaults to 3 set, like the class slides.
    if (k === "EMOM" && !sets.trim()) onChange({ sets: "3" });
  }

  const preview = schemeLine(formatScheme({ kind, value: value || SCHEME_DEFAULTS[kind], custom }), sets);

  return (
    <tr>
      <td colSpan={7} className="border-b border-border bg-accent/5 px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="font-display font-bold">Round {roundNumber}</span>
          <select
            value={kind}
            onChange={(e) => pickKind(e.target.value as SchemeKind)}
            aria-label={`Skema round ${roundNumber}`}
            className="rounded border border-border bg-surface px-2 py-1 text-sm font-semibold text-foreground focus:border-accent focus:outline-none"
          >
            {SCHEME_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>

          {kind === "EMOM" && (
            <label className="flex items-center gap-1 font-semibold">
              E
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  emit({ value: e.target.value });
                }}
                aria-label="Menit EMOM"
                className={numInput}
              />
              MOM
            </label>
          )}
          {kind === "AMRAP" && (
            <label className="flex items-center gap-1 font-semibold">
              AMRAP
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  emit({ value: e.target.value });
                }}
                aria-label="Menit AMRAP"
                className={numInput}
              />
              min
            </label>
          )}
          {kind === "TABATA" && (
            <label className="flex items-center gap-1 font-semibold">
              TABATA
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  emit({ value: e.target.value });
                }}
                aria-label="Jumlah section TABATA"
                className={numInput}
              />
              SECTION
            </label>
          )}
          {kind === "FOR_TIME" && (
            <label className="flex items-center gap-1 font-semibold">
              FOR TIME
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  emit({ value: e.target.value });
                }}
                aria-label="Menit FOR TIME"
                className={numInput}
              />
              min
            </label>
          )}
          {kind === "CUSTOM" && (
            <input
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                emit({ custom: e.target.value });
              }}
              placeholder="mis. Team of 2, Ladder 1-10"
              aria-label="Skema lainnya"
              className="min-w-40 flex-1 rounded border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          )}
          {schemeUsesSets(kind) && kind !== "NONE" && (
            <label className="flex items-center gap-1 font-semibold">
              (
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={sets}
                onChange={(e) => onChange({ sets: e.target.value })}
                aria-label="Jumlah set"
                className={numInput}
              />
              set)
            </label>
          )}

          {preview && (
            <span className="ml-auto rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-border">
              Di slide: <span className="text-foreground">{preview}</span>
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
