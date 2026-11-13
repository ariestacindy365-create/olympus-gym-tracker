"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type BottomNavIcon = "latihan" | "feed" | "body" | "emblem" | "akun" | "home" | "members" | "program" | "pt" | "lead" | "bayar" | "kasir" | "harga";

const ICONS: Record<BottomNavIcon | "more", string> = {
  latihan: "M4 10h2m12 0h2M6 7v6m12-6v6M8 10h8M9 5v10m6-10v10",
  feed: "M4 5h16v10H8l-4 4V5zM8 9h8M8 12h5",
  body: "M12 4a2 2 0 110 4 2 2 0 010-4zM7 10h10l-1.5 4H14v6h-4v-6H8.5L7 10z",
  emblem: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z",
  akun: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0",
  home: "M4 11l8-7 8 7M6 10v9h4v-5h4v5h4v-9",
  members: "M9 11a3 3 0 100-6 3 3 0 000 6zm-6 8a6 6 0 0112 0M16 5.5a3 3 0 010 5.5M21 19a6 6 0 00-4-5.6",
  program: "M6 4h12v16H6zM9 8h6M9 12h6M9 16h4",
  pt: "M3 12h2m14 0h2M5 9v6m14-6v6M7 12h10M12 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3z",
  lead: "M4 6h16M4 12h10M4 18h7M17 15l2 2 3-4",
  bayar: "M3 7h18v10H3zM3 10h18M7 14h3",
  kasir: "M4 6h2v12H4zM8 6h1v12H8zM11 6h2v12h-2zM15 6h1v12h-1zM18 6h2v12h-2z",
  harga: "M4 4h8l8 8-8 8-8-8V4zM8 8h.01",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

export interface BottomNavItem {
  href: string;
  label: string;
  icon?: BottomNavIcon;
  /** Sub-paths under href that belong to another section. */
  exclude?: string[];
}

const matches = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/**
 * Phone navigation for every role: up to four thumb-reachable tabs plus
 * "Lainnya", a sheet with the rest of the pages (instead of a tab strip that
 * has to be scrolled sideways to find them). Desktop keeps the header links.
 */
export function BottomNav({ items, more = [], label }: { items: BottomNavItem[]; more?: BottomNavItem[]; label: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const all = [...items, ...more];
  const activeHref = all
    .filter((l) => matches(pathname, l.href) && !l.exclude?.some((p) => matches(pathname, p)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const inMore = more.some((m) => m.href === activeHref);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const tabClass = (active: boolean) =>
    `flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${active ? "text-white" : "text-nav-muted active:text-nav-foreground"}`;
  const pill = (active: boolean) => `flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-accent" : ""}`;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[29] sm:hidden print:hidden">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Menu lainnya"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-white/10 bg-nav-bg px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 animate-pop-in"
          >
            <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <ul className="grid grid-cols-2 gap-2">
              {more.map((m) => {
                const active = m.href === activeHref;
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center rounded-xl px-4 text-sm font-semibold ${active ? "bg-accent text-white" : "bg-white/5 text-nav-foreground active:bg-white/10"}`}
                    >
                      {m.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-nav-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden">
        <ul className="mx-auto flex max-w-md">
          {items.map((item) => {
            const active = !open && item.href === activeHref;
            return (
              <li key={item.href} className="flex-1">
                <Link href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                  <span className={pill(active)}>
                    <Icon d={ICONS[item.icon ?? "home"]} />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          {more.length > 0 && (
            <li className="flex-1">
              <button type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)} className={tabClass(open || inMore)}>
                <span className={pill(open || inMore)}>
                  <Icon d={ICONS.more} />
                </span>
                Lainnya
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
