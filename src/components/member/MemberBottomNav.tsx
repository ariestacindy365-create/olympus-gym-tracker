"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/member/dashboard",
    label: "Latihan",
    icon: "M4 10h2m12 0h2M6 7v6m12-6v6M8 10h8M9 5v10m6-10v10",
  },
  {
    href: "/member/body",
    label: "Body",
    icon: "M12 4a2 2 0 110 4 2 2 0 010-4zM7 10h10l-1.5 4H14v6h-4v-6H8.5L7 10z",
  },
  {
    href: "/member/achievements",
    label: "Emblem",
    icon: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z",
  },
  {
    href: "/member/account",
    label: "Akun",
    icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0",
  },
];

// Phone-first navigation for members: a thumb-reachable tab bar instead of
// the scrolling tab strip under the header (desktop keeps the header links).
export function MemberBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu member"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-nav-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                  active ? "text-white" : "text-nav-muted active:text-nav-foreground"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-accent" : ""}`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={item.icon} />
                  </svg>
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
