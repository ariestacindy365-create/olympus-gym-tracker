"use client";

import { useState } from "react";
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

export function NavBar({ links, userName }: NavBarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-nav-bg">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <OlympusLogo height={28} variant="light" />
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  isActive(link.href) ? "bg-white/10 text-accent" : "text-nav-muted hover:text-nav-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-nav-muted sm:inline">{userName}</span>
          <LogoutButton />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-nav-foreground sm:hidden"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive(link.href) ? "bg-white/10 text-accent" : "text-nav-muted hover:text-nav-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <span className="mt-1 border-t border-white/10 px-3 pt-2 text-xs text-nav-muted">{userName}</span>
        </nav>
      )}
    </header>
  );
}
