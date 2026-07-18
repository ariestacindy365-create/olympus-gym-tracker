"use client";

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

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-nav-bg">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <OlympusLogo height={28} variant="light" />
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-white/10 text-accent" : "text-nav-muted hover:text-nav-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-nav-muted sm:inline">{userName}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
