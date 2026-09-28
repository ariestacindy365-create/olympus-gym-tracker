"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon, MonitorIcon } from "@/components/ui/Icons";

type Theme = "system" | "light" | "dark";
const STORAGE_KEY = "theme";
const ORDER: Theme[] = ["system", "light", "dark"];

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing etc. — theme just won't persist across reloads.
    }
  } else {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Same as above.
    }
  }
}

const ICON: Record<Theme, React.ComponentType<{ className?: string }>> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

const LABEL: Record<Theme, string> = {
  system: "Ikuti Sistem",
  light: "Terang",
  dark: "Gelap",
};

// A three-way cycle (system → light → dark → system…) rather than a plain
// on/off switch — "system" has to stay reachable, otherwise there'd be no
// way back to following the device's own setting once overridden.
export function ThemeToggle({ className = "" }: { className?: string }) {
  // Starts at "system" on the server and first client render (matching the
  // no-JS default), then syncs to whatever the inline script in the root
  // layout already applied — avoids a hydration mismatch without needing
  // that script to also touch React state.
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    // localStorage isn't available during SSR, so this can only run after
    // mount — there's no state to derive this from during render itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readStoredTheme());
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    applyTheme(next);
  }

  const Icon = ICON[theme];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Tema: ${LABEL[theme]}. Klik untuk ganti.`}
      title={`Tema: ${LABEL[theme]}`}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-nav-muted transition hover:bg-white/10 hover:text-nav-foreground ${className}`}
    >
      <Icon className="text-base" />
    </button>
  );
}
