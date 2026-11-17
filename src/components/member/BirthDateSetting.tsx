"use client";

import { useState } from "react";
import { BirthDatePrompt } from "@/components/member/LoginPrompts";
import { MONTHS_ID } from "@/lib/birthDate";

/** Akun: the member's date of birth, with Ubah to correct it. */
export function BirthDateSetting({ value }: { value: string | null }) {
  const [editing, setEditing] = useState(false);
  const label = value
    ? (() => {
        const [y, m, d] = value.split("-").map(Number);
        return `${d} ${MONTHS_ID[m - 1]} ${y}`;
      })()
    : "Belum diisi";
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm">{label}</p>
      <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-accent hover:bg-accent/10">
        Ubah
      </button>
      {editing && <BirthDatePrompt initial={value} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />}
    </div>
  );
}
