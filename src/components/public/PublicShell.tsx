import Link from "next/link";
import { OlympusLogo } from "@/components/ui/OlympusLogo";
import { GYM } from "@/lib/gymInfo";

/** Header and footer of the public website pages (no login needed). */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-nav-bg/95 text-nav-foreground backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label={GYM.name}>
            <OlympusLogo height={30} variant="light" />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <Link href="/#paket" className="hidden rounded-lg px-3 py-2 text-nav-muted hover:text-nav-foreground sm:inline">
              Paket
            </Link>
            <Link href="/#lokasi" className="hidden rounded-lg px-3 py-2 text-nav-muted hover:text-nav-foreground sm:inline">
              Lokasi
            </Link>
            <Link href="/login" className="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-2">
              Masuk member
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-nav-bg text-nav-foreground">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <OlympusLogo height={26} variant="light" />
            <p className="text-nav-muted">{GYM.address}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="font-semibold">Kontak</p>
            <a href={GYM.whatsappUrl} target="_blank" rel="noreferrer" className="text-nav-muted hover:text-nav-foreground">
              WhatsApp {GYM.whatsapp}
            </a>
            <a href={GYM.instagramUrl} target="_blank" rel="noreferrer" className="text-nav-muted hover:text-nav-foreground">
              Instagram {GYM.instagram}
            </a>
            <p className="text-nav-muted">{GYM.hours}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="font-semibold">Informasi</p>
            <Link href="/syarat-ketentuan" className="text-nav-muted hover:text-nav-foreground">Syarat &amp; Ketentuan</Link>
            <Link href="/kebijakan-refund" className="text-nav-muted hover:text-nav-foreground">Kebijakan Refund &amp; Pembatalan</Link>
            <Link href="/kebijakan-privasi" className="text-nav-muted hover:text-nav-foreground">Kebijakan Privasi</Link>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-nav-muted">© {new Date().getFullYear()} {GYM.name}</p>
      </footer>
    </div>
  );
}

/** A plain text page (terms, policies) inside the public shell. */
export function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <PublicShell>
      <article className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10 text-[15px] leading-relaxed [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-foreground/90">
        <header>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted">{GYM.name} · Terakhir diperbarui {updated}</p>
        </header>
        {children}
      </article>
    </PublicShell>
  );
}
