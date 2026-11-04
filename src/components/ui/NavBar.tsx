"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { OlympusLogo } from "@/components/ui/OlympusLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface NavLink {
  href: string;
  label: string;
  // Sub-paths under href that belong to another section, so e.g. "/leads"
  // isn't highlighted on "/leads/finance".
  exclude?: string[];
}

function matches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

type NavRole = "MEMBER" | "COACH" | "ADMIN" | "OWNER";

// Each account type gets its own chip so a shared device (e.g. the front-desk
// tablet) makes it obvious whose view is open.
const ROLE_CHIP: Record<NavRole, { label: string; className: string }> = {
  MEMBER: { label: "Member", className: "bg-sky-400/15 text-sky-200 ring-sky-400/30" },
  COACH: { label: "Coach", className: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30" },
  ADMIN: { label: "Admin", className: "bg-amber-400/15 text-amber-200 ring-amber-400/30" },
  OWNER: { label: "Owner", className: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-400/30" },
};

interface NavBarProps {
  links: NavLink[];
  /** Less-used pages: under "Lainnya ▾" on desktop so the bar fits; in the phone strip like the rest. */
  more?: NavLink[];
  userName: string;
  role: NavRole;
  /** Off when the page supplies its own mobile navigation (member bottom bar). */
  mobileTabs?: boolean;
  /** Extra controls before the theme toggle, e.g. the member's notification bell. */
  extra?: React.ReactNode;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

// Links prefetch by default as soon as they're on screen, which for a full
// nav bar means several server renders on every page view. Only prefetch
// once the user shows intent (hover, touch or keyboard focus).
function IntentPrefetchLink(props: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  const markIntent = () => setIntent(true);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={markIntent}
      onTouchStart={markIntent}
      onFocus={markIntent}
    />
  );
}

const NO_LINKS: NavLink[] = [];

/** "Lainnya ▾": the desktop bar's overflow menu. Closes on a pick, outside click or Escape. */
function MoreMenu({ links, activeHref }: { links: NavLink[]; activeHref: string | undefined }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const current = links.find((l) => l.href === activeHref);
  return (
    <div ref={ref} className="relative hidden shrink-0 xl:block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-medium transition ${
          current ? "bg-white/10 text-white shadow-[inset_0_-2px_0_var(--accent)]" : "text-nav-muted hover:bg-white/5 hover:text-nav-foreground"
        }`}
      >
        {current?.label ?? "Lainnya"}
        <span aria-hidden className={`inline-block text-[10px] transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-44 rounded-xl border border-white/10 bg-nav-bg p-1 shadow-raised">
          {links.map((link) => (
            <IntentPrefetchLink
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              aria-current={link.href === activeHref ? "page" : undefined}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                link.href === activeHref ? "bg-white/10 text-white" : "text-nav-muted hover:bg-white/5 hover:text-nav-foreground"
              }`}
            >
              {link.label}
            </IntentPrefetchLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavBar({ links: mainLinks, more = NO_LINKS, userName, role, mobileTabs = true, extra }: NavBarProps) {
  const pathname = usePathname();
  // Every page, for the active highlight and the phone strip.
  const links = useMemo(() => [...mainLinks, ...more], [mainLinks, more]);
  const mobileNavRef = useRef<HTMLElement>(null);
  // The mobile nav is a horizontally scrolling strip with more links than
  // fit on screen (e.g. Kasir/Riwayat/Harga/Akun sit off the right edge) —
  // with nothing to hint at that, it just looks like the full menu. These
  // track scroll position so a fade can mark whichever edge has more to see.
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // Prefer the most specific match so "/leads" isn't also highlighted while
  // on "/leads/renewals".
  const activeHref = links
    .filter((link) => matches(pathname, link.href) && !link.exclude?.some((path) => matches(pathname, path)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // Keep the active tab visible in the horizontally scrolling mobile strip.
  useEffect(() => {
    const active = mobileNavRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeHref]);

  useEffect(() => {
    const el = mobileNavRef.current;
    if (!el) return;
    function updateFades() {
      if (!el) return;
      setShowLeftFade(el.scrollLeft > 4);
      setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }
    updateFades();
    el.addEventListener("scroll", updateFades, { passive: true });
    window.addEventListener("resize", updateFades);
    return () => {
      el.removeEventListener("scroll", updateFades);
      window.removeEventListener("resize", updateFades);
    };
  }, [links]);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-nav-bg print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-6">
          <OlympusLogo height={28} variant="light" className="shrink-0" />
          <div className="hidden min-w-0 items-center gap-1 xl:flex">
          <nav aria-label="Navigasi utama" className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto">
            {mainLinks.map((link) => {
              const active = link.href === activeHref;
              return (
                <IntentPrefetchLink
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-white/10 text-white shadow-[inset_0_-2px_0_var(--accent)]"
                      : "text-nav-muted hover:bg-white/5 hover:text-nav-foreground"
                  }`}
                >
                  {link.label}
                </IntentPrefetchLink>
              );
            })}
          </nav>
          {more.length > 0 && <MoreMenu links={more} activeHref={activeHref} />}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${ROLE_CHIP[role].className}`}
          >
            {ROLE_CHIP[role].label}
          </span>
          <div className="flex items-center gap-2" title={userName}>
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-blue-200 ring-1 ring-accent/40"
            >
              {initials(userName)}
            </span>
            <span className="hidden max-w-[8rem] truncate text-sm text-nav-foreground/90 md:inline">{userName}</span>
          </div>
          {extra}
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>

      <div className={`relative border-t border-white/5 xl:hidden ${mobileTabs ? "block" : "hidden sm:block"}`}>
        <nav aria-label="Navigasi utama" ref={mobileNavRef} className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 pt-1.5">
          {links.map((link) => {
            const active = link.href === activeHref;
            return (
              <IntentPrefetchLink
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-3 text-sm font-medium transition ${
                  active ? "bg-accent text-white" : "text-nav-muted active:bg-white/10"
                }`}
              >
                {link.label}
              </IntentPrefetchLink>
            );
          })}
        </nav>
        {/* Fade hints, not scroll affordances themselves — they only tell you
            there's more this way, the strip underneath still does the work. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-nav-bg to-transparent transition-opacity ${
            showLeftFade ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-nav-bg to-transparent transition-opacity ${
            showRightFade ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </header>
  );
}
