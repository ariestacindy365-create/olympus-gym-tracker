import Link from "next/link";
import { OlympusLogo } from "@/components/ui/OlympusLogo";
import { GYM } from "@/lib/gymInfo";

/** Header and footer of the public website pages (no login needed). */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const link = "hidden rounded-md px-3 py-2 text-muted hover:text-foreground md:inline";
  return (
    <div className="site-light flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label={GYM.name}>
            <OlympusLogo height={30} variant="dark" />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/#kenapa" className={link}>
              Kenapa Olympus
            </Link>
            <Link href="/#program" className={link}>
              Program
            </Link>
            <Link href="/#paket" className={link}>
              Paket
            </Link>
            <Link href="/#lokasi" className={link}>
              Lokasi
            </Link>
            <Link href="/login" className="ml-2 rounded-md border border-border px-4 py-2 font-semibold text-foreground hover:border-accent hover:text-accent">
              Masuk member
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-surface-2">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <OlympusLogo height={26} variant="dark" />
            <p className="text-muted">{GYM.address}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="font-semibold">Kontak</p>
            <a href={GYM.whatsappUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-accent">
              WhatsApp {GYM.whatsapp}
            </a>
            <a href={GYM.instagramUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-accent">
              Instagram {GYM.instagram}
            </a>
            <p className="text-muted">{GYM.hours}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="font-semibold">Informasi</p>
            <Link href="/syarat-ketentuan" className="text-muted hover:text-accent">Syarat &amp; Ketentuan</Link>
            <Link href="/kebijakan-refund" className="text-muted hover:text-accent">Kebijakan Refund &amp; Pembatalan</Link>
            <Link href="/kebijakan-privasi" className="text-muted hover:text-accent">Kebijakan Privasi</Link>
          </div>
        </div>
        <p className="border-t border-border px-4 py-4 text-center text-xs text-muted">© {new Date().getFullYear()} {GYM.name}</p>
      </footer>
    </div>
  );
}

/** A plain text page (terms, policies) inside the public shell. */
export function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <PublicShell>
      <article className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10 text-[15px] leading-relaxed [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-foreground/90">
        <header>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted">{GYM.name} · Terakhir diperbarui {updated}</p>
        </header>
        {children}
      </article>
    </PublicShell>
  );
}
