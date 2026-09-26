"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { OlympusLogo } from "@/components/ui/OlympusLogo";

interface NavLink {
  href: string;
  label: string;
}

interface NavBarProps {
  links: NavLink[];
  userName: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function NavBar({ links, userName }: NavBarProps) {
  const pathname = usePathname();
  const mobileNavRef = useRef<HTMLElement>(null);

  // Prefer the most specific match so "/leads" isn't also highlighted while
  // on "/leads/renewals".
  const activeHref = links
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // Keep the active tab visible in the horizontally scrolling mobile strip.
  useEffect(() => {
    const active = mobileNavRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeHref]);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-nav-bg print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-6">
          <OlympusLogo height={28} variant="light" className="shrink-0" />
          <nav className="no-scrollbar hidden min-w-0 items-center gap-1 overflow-x-auto sm:flex">
            {links.map((link) => {
              const active = link.href === activeHref;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-white/10 text-white shadow-[inset_0_-2px_0_var(--accent)]"
                      : "text-nav-muted hover:bg-white/5 hover:text-nav-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2" title={userName}>
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-blue-200 ring-1 ring-accent/40"
            >
              {initials(userName)}
            </span>
            <span className="hidden max-w-[10rem] truncate text-sm text-nav-foreground/90 md:inline">{userName}</span>
          </div>
          <LogoutButton />
        </div>
      </div>

      <nav
        ref={mobileNavRef}
        className="no-scrollbar flex gap-1 overflow-x-auto border-t border-white/5 px-3 pb-2 pt-1.5 sm:hidden"
      >
        {links.map((link) => {
          const active = link.href === activeHref;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active ? "bg-accent text-white" : "text-nav-muted active:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
