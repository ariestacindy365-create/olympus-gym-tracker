"use client";

import { useState } from "react";
import { LIFTER_CHARACTERS, saveStoryCharacter, type LifterCharacter } from "@/lib/volumeStory";

interface StoryCharacterPickerProps {
  value: LifterCharacter | null;
  onChange: (character: LifterCharacter) => void;
  /** "dark" inside the story popup, "light" on regular pages. */
  tone?: "dark" | "light";
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

/** Account-page version: saves the pick to the member's profile right away. */
export function StoryCharacterSetting({ initial }: { initial: LifterCharacter | null }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function pick(character: LifterCharacter) {
    const previous = value;
    setValue(character);
    setStatus("saving");
    const ok = await saveStoryCharacter(character);
    if (!ok) setValue(previous);
    setStatus(ok ? "saved" : "error");
  }

  return (
    <div className="flex flex-col gap-2">
      <StoryCharacterPicker value={value} onChange={pick} disabled={status === "saving"} />
      <p className={`text-xs ${status === "error" ? "text-danger" : "text-muted"}`}>
        {status === "saving" && "Menyimpan..."}
        {status === "saved" && "Tersimpan. Kartu share berikutnya pakai karakter ini."}
        {status === "error" && "Gagal menyimpan. Coba lagi."}
        {status === "idle" && (value ? "Bisa diganti kapan saja." : "Belum dipilih — kamu akan diminta memilih saat pertama kali membuka kartu.")}
      </p>
    </div>
  );
}
