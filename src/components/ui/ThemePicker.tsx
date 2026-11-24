"use client";

import { useEffect, useState } from "react";
import { LABEL, applyTheme, readStoredTheme, type Theme } from "@/components/ui/ThemeToggle";

/** Terang / Gelap / Ikuti Sistem as three buttons (the member's Akun page). */
export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    // Stored on this device; read after mount so the server render matches.
    const id = setTimeout(() => setTheme(readStoredTheme()), 0);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tampilan">
      {(["light", "dark", "system"] as Theme[]).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => {
            applyTheme(t);
            setTheme(t);
          }}
          className={`min-h-11 rounded-lg border text-sm font-semibold ${theme === t ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface hover:bg-surface-2"}`}
        >
          {LABEL[t]}
        </button>
      ))}
    </div>
  );
}
