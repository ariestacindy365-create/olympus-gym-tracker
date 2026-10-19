"use client";

import { useState } from "react";
import {
  DEFAULT_SKIN_TONE,
  LIFTER_CHARACTERS,
  SKIN_TONES,
  saveStoryPrefs,
  type LifterCharacter,
  type SkinTone,
} from "@/lib/volumeStory";

type Tone = "dark" | "light";

interface StoryCharacterPickerProps {
  value: LifterCharacter | null;
  onChange: (character: LifterCharacter) => void;
  /** "dark" inside the story popup, "light" on regular pages. */
  tone?: Tone;
  disabled?: boolean;
}

export function StoryCharacterPicker({ value, onChange, tone = "light", disabled }: StoryCharacterPickerProps) {
  return (
    <div role="radiogroup" aria-label="Pilih karakter" className="grid w-full grid-cols-3 gap-2">
      {LIFTER_CHARACTERS.map((c) => {
        const selected = value === c.id;
        const idle =
          tone === "dark"
            ? "bg-white/10 text-white/80 hover:bg-white/20"
            : "border border-border bg-surface-2 text-foreground hover:border-border-strong";
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c.id)}
            disabled={disabled}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition disabled:opacity-60 ${
              selected ? "bg-accent text-white ring-2 ring-accent/40" : idle
            }`}
          >
            <span className="text-2xl leading-none">{c.emoji}</span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

interface SkinTonePickerProps {
  value: SkinTone;
  onChange: (skinTone: SkinTone) => void;
  tone?: Tone;
  disabled?: boolean;
}

/** Round swatches for the lifter's skin colour. */
export function SkinTonePicker({ value, onChange, tone = "light", disabled }: SkinTonePickerProps) {
  const current = SKIN_TONES.find((t) => t.id === value);
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <span className={`text-xs font-semibold ${tone === "dark" ? "text-white/80" : "text-muted"}`}>
        Warna kulit{current ? `: ${current.label}` : ""}
      </span>
      <div role="radiogroup" aria-label="Pilih warna kulit" className="flex gap-2">
        {SKIN_TONES.map((t) => {
          const selected = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={t.label}
              title={t.label}
              onClick={() => onChange(t.id)}
              disabled={disabled}
              className={`h-8 w-8 rounded-full transition disabled:opacity-60 ${
                selected
                  ? "ring-2 ring-accent ring-offset-2 " + (tone === "dark" ? "ring-offset-[#0b1220]" : "ring-offset-surface")
                  : tone === "dark"
                    ? "ring-1 ring-white/30 hover:ring-white/60"
                    : "ring-1 ring-border hover:ring-border-strong"
              }`}
              style={{ background: t.color }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Account-page version: saves each pick to the member's profile right away. */
export function StoryCharacterSetting({
  initialCharacter,
  initialSkinTone,
}: {
  initialCharacter: LifterCharacter | null;
  initialSkinTone: SkinTone | null;
}) {
  const [character, setCharacter] = useState(initialCharacter);
  const [skinTone, setSkinTone] = useState<SkinTone>(initialSkinTone ?? DEFAULT_SKIN_TONE);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(prefs: { character?: LifterCharacter; skinTone?: SkinTone }, undo: () => void) {
    setStatus("saving");
    const ok = await saveStoryPrefs(prefs);
    if (!ok) undo();
    setStatus(ok ? "saved" : "error");
  }

  function pickCharacter(c: LifterCharacter) {
    const previous = character;
    setCharacter(c);
    void save({ character: c, skinTone }, () => setCharacter(previous));
  }

  function pickSkin(t: SkinTone) {
    const previous = skinTone;
    setSkinTone(t);
    void save(character ? { character, skinTone: t } : { skinTone: t }, () => setSkinTone(previous));
  }

  return (
    <div className="flex flex-col gap-3">
      <StoryCharacterPicker value={character} onChange={pickCharacter} disabled={status === "saving"} />
      <SkinTonePicker value={skinTone} onChange={pickSkin} disabled={status === "saving"} />
      <p className={`text-xs ${status === "error" ? "text-danger" : "text-muted"}`}>
        {status === "saving" && "Menyimpan..."}
        {status === "saved" && "Tersimpan. Kartu share berikutnya pakai pilihan ini."}
        {status === "error" && "Gagal menyimpan. Coba lagi."}
        {status === "idle" &&
          (character ? "Bisa diganti kapan saja." : "Belum dipilih — kamu akan diminta memilih saat pertama kali membuka kartu.")}
      </p>
    </div>
  );
}
