import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHomePath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/packages";
import { GYM, packageDuration } from "@/lib/gymInfo";
import { PublicShell } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "OLYMPUS Lifting Club · Gym di Sungai Kedukan, Banyuasin",
  description: "Gym kelas bootcamp, lifting, dan personal training di Ogan Permata Indah, Banyuasin. Lihat paket membership, harga, lokasi, dan jam buka.",
};

/** A picture spot: the gym's own photos in public/web, over a gradient while loading. */
function PhotoSpot({ label, src, tone = "blue", className = "" }: { label: string; src?: string; tone?: "blue" | "dark" | "sky"; className?: string }) {
  const bg =
    tone === "dark"
      ? "from-[#0b1220] via-[#13245a] to-[#1d3f9a]"
      : tone === "sky"
        ? "from-[#dbeafe] via-[#bfdbfe] to-[#93c5fd]"
        : "from-[#1e3a8a] via-[#2563eb] to-[#60a5fa]";
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${bg} ${className}`} role="img" aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <svg viewBox="0 0 120 120" className={`absolute inset-0 m-auto h-1/2 w-1/2 opacity-25 ${src ? "hidden" : ""}`} fill="none" stroke="white" strokeWidth="3" aria-hidden>
        <path d="M18 60h84M28 46v28M38 40v40M82 40v40M92 46v28" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Signed-in people go to their dashboard; everyone else sees the gym's
// public website (profile, packages and prices, location, contact).
export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) redirect(roleHomePath(user.role));

  const packages = await prisma.package.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    select: { id: true, name: true, price: true, durationDays: true, durationMonths: true, kind: true, credits: true, category: true, fineprint: true },
  });
  // The same package can exist twice (an older desk-only copy without a
  // category): list each name once, keeping the one with its details.
  const byName = new Map<string, (typeof packages)[number]>();
  for (const p of packages) {
    const key = p.name.trim().toLowerCase();
    const seen = byName.get(key);
    if (!seen || (!seen.category && p.category)) byName.set(key, p);
  }
  const unique = packages.filter((p) => byName.get(p.name.trim().toLowerCase()) === p);
  // Once packages are sorted into categories, the uncategorized ones are old
  // desk entries (also renamed copies, like "Bootcamp 1 Bulan Unlimited").
  const listed = unique.some((p) => p.category) ? unique.filter((p) => p.category) : unique;
  const groups = new Map<string, typeof packages>();
  for (const p of listed) {
    const key = p.category?.trim() || "Paket lainnya";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const from = (group: string) => {
    const items = groups.get(group);
    return items?.length ? Math.min(...items.map((p) => p.price)) : null;
  };

  const paths: { title: string; text: string; group: string; photo: string; src: string }[] = [
    { title: "Bootcamp Class", text: "Kelas berkelompok, program mingguan dari coach.", group: "Bootcamp Class", photo: "Kelas bootcamp", src: "/web/bootcamp.jpg" },
    { title: "Private Training", text: "1 on 1 bareng coach, program khusus untukmu.", group: "Private Training", photo: "Latihan privat", src: "/web/private.jpg" },
    { title: "Couple Training", text: "Latihan berdua dengan satu coach.", group: "Couple Training", photo: "Latihan berdua", src: "/web/couple.jpg" },
    { title: "Private Group", text: "Kelas privat untuk grup hingga 5 orang.", group: "Private Group Class", photo: "Grup privat", src: "/web/group.jpg" },
  ];

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#f3f6fb] dark:bg-background">
        <div aria-hidden className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#bfdbfe]/60 blur-3xl dark:bg-[#1d3f9a]/40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent">{GYM.name}</span>
            <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl">
              Lebih kuat
              <br />
              <span className="text-accent">setiap hari.</span>
            </h1>
            <p className="max-w-md text-lg text-muted">Latihan terprogram bersama coach. Catat beban, kejar rekor pribadi, dan lihat progresmu naik dari minggu ke minggu.</p>
            <div className="flex flex-wrap items-center gap-3">
              <a href={GYM.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-nav-bg px-6 py-3 font-semibold text-white hover:bg-black">
                Mulai latihan <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">→</span>
              </a>
              <a href="#paket" className="rounded-full px-5 py-3 font-semibold text-foreground ring-1 ring-border hover:bg-surface">
                Lihat paket
              </a>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2" aria-hidden>
                {["#2563eb", "#0ea5e9", "#1e3a8a", "#60a5fa"].map((c) => (
                  <span key={c} className="h-9 w-9 rounded-full border-2 border-[#f3f6fb] dark:border-background" style={{ background: c }} />
                ))}
              </div>
              <p className="text-sm text-muted">
                <b className="text-foreground">150+ member</b> sudah latihan bareng Olympus
              </p>
            </div>
          </div>

          <div className="relative">
            <PhotoSpot label="Member Olympus mengangkat beban" src="/web/hero.jpg" className="aspect-[4/5] w-full rounded-[2rem] shadow-overlay" />
            {/* Like the app's progress card */}
            <div className="absolute left-3 bottom-6 w-60 rounded-2xl bg-surface p-4 shadow-overlay ring-1 ring-border md:-left-10">
              <p className="text-xs font-semibold text-muted">Progres hari ini</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" aria-hidden>
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="97.4" strokeDashoffset="21.4" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold">78%</span>
                </div>
                <div className="text-xs">
                  <p className="font-semibold">6 / 8 set</p>
                  <p className="text-muted">Lower Body</p>
                </div>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5 text-xs">
                <li className="flex justify-between"><span>🏆 Back Squat</span><b>100 kg × 5</b></li>
                <li className="flex justify-between"><span>🏋️ Volume</span><b>2.960 kg</b></li>
                <li className="flex justify-between"><span>🔥 Streak</span><b>5 hari</b></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why Olympus */}
      <section className="relative z-10 mx-auto -mt-6 max-w-6xl px-4">
        <div className="grid gap-6 rounded-3xl bg-nav-bg p-6 text-nav-foreground shadow-overlay sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["📋", "Program terarah", "Program mingguan dari coach, tampil di aplikasi dan layar kelas."],
            ["🧑‍🏫", "Coach berpengalaman", "Teknik angkatan diawasi, beban disesuaikan kemampuanmu."],
            ["📈", "Catat & pantau", "Set, beban, dan rekor pribadi tercatat otomatis di HP."],
            ["🤝", "Komunitas solid", "Latihan bareng, rayakan setiap PR bersama di kelas."],
          ].map(([icon, title, text]) => (
            <div key={title} className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">{icon}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-nav-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Choose your path */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Pilih jalurmu</p>
        <h2 className="mt-1 font-display text-3xl font-bold uppercase sm:text-4xl">Latihan sesuai tujuanmu</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {paths.map((p) => {
              const price = from(p.group);
              return (
                <a key={p.title} href="#paket" className="group overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-border transition hover:-translate-y-0.5">
                  <PhotoSpot label={p.photo} src={p.src} tone="sky" className="aspect-[4/3] w-full" />
                  <div className="p-3">
                    <p className="font-semibold">{p.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{p.text}</p>
                    {price != null && <p className="mt-2 text-xs font-bold text-accent">mulai {formatRupiah(price)}</p>}
                  </div>
                </a>
              );
            })}
          </div>
          <div className="relative min-h-64 overflow-hidden rounded-2xl">
            <PhotoSpot label="Suasana latihan di kelas" src="/web/video.jpg" tone="dark" className="absolute inset-0" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0b1220]/85 via-[#0b1220]/40 to-transparent" />
            <div className="relative flex h-full flex-col justify-between p-5 text-white">
              <p className="font-display text-3xl font-bold uppercase leading-tight">
                Badan kuat.
                <br />
                Pikiran tajam.
                <br />
                Hidup lebih baik.
              </p>
              <div className="flex items-center justify-between">
                <p className="max-w-[12rem] text-sm text-white/80">Lihat suasana kelas Olympus di Instagram.</p>
                <a href={GYM.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram Olympus" className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-nav-bg">
                  ▶
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="grid grid-cols-2 gap-6 rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:grid-cols-[1.2fr_repeat(4,1fr)] sm:items-center">
          <p className="col-span-2 font-display text-2xl font-bold uppercase leading-tight sm:col-span-1">
            Hasil yang
            <br />
            <span className="text-accent">bicara sendiri</span>
          </p>
          {[
            ["150+", "Member aktif"],
            ["2.000+", "Rekor pribadi tercatat"],
            ["6 hari", "Kelas setiap minggu"],
            ["4,9/5", "Rating member"],
          ].map(([n, l]) => (
            <div key={l}>
              <p className="font-display text-3xl font-bold">{n}</p>
              <p className="text-sm text-muted">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Packages & prices */}
      <section id="paket" className="scroll-mt-20 bg-[#f3f6fb] dark:bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Paket & harga</p>
          <h2 className="mt-1 font-display text-3xl font-bold uppercase sm:text-4xl">Pilih paketmu</h2>
          <p className="mt-1 text-sm text-muted">Harga dalam Rupiah. Paket aktif setelah pembayaran dikonfirmasi.</p>
          {packages.length === 0 && <p className="mt-6 text-muted">Daftar paket sedang diperbarui. Hubungi kami lewat WhatsApp untuk info harga.</p>}
          {[...groups.entries()].map(([group, items]) => (
            <div key={group} className="mt-8">
              <h3 className="font-display text-xl font-bold">{group}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => {
                  const duration = packageDuration(p);
                  return (
                    <div key={p.id} className="flex flex-col gap-1 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border">
                      <p className="font-semibold">{p.name}</p>
                      <p className="font-display text-3xl font-bold text-accent">{formatRupiah(p.price)}</p>
                      <p className="text-sm text-muted">
                        {[p.credits != null ? `${p.credits} sesi` : p.kind ? "Sesi tidak terbatas" : null, duration ? `berlaku ${duration}` : null].filter(Boolean).join(" · ")}
                      </p>
                      {p.fineprint && <p className="text-xs text-muted">{p.fineprint}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-10 rounded-2xl bg-surface p-5 ring-1 ring-border">
            <h3 className="font-display text-xl font-bold">Cara membeli</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground/90">
              <li>Buat akun member di aplikasi Olympus (tombol &quot;Masuk member&quot; → &quot;Buat akun member&quot;).</li>
              <li>Pilih paket di menu Paket, lalu bayar dengan QRIS (semua e-wallet &amp; m-banking), virtual account bank, atau transfer bank.</li>
              <li>Paket aktif otomatis setelah pembayaran QRIS / virtual account berhasil; transfer manual aktif setelah diverifikasi admin.</li>
              <li>Bisa juga membeli langsung di meja admin gym (tunai, kartu debit/kredit, atau QRIS).</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-accent p-8 text-white shadow-overlay sm:flex-row sm:items-center [background-image:radial-gradient(30rem_12rem_at_100%_0%,rgb(255_255_255/0.18),transparent)]">
          <div>
            <p className="font-display text-3xl font-bold uppercase leading-tight">Transformasimu mulai hari ini</p>
            <p className="mt-1 text-white/85">Datang coba kelas, atau tanya dulu lewat WhatsApp.</p>
          </div>
          <a href={GYM.whatsappUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-white px-6 py-3 font-semibold text-accent hover:bg-white/90">
            Chat WhatsApp →
          </a>
        </div>
      </section>

      {/* Location & contact */}
      <section id="lokasi" className="mx-auto grid max-w-6xl scroll-mt-20 gap-6 px-4 pb-14 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Lokasi</p>
          <h2 className="mt-1 font-display text-3xl font-bold uppercase">Lokasi &amp; jam buka</h2>
          <p className="mt-3">{GYM.address}</p>
          <a href={GYM.mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-accent hover:underline">
            Buka di Google Maps →
          </a>
          <p className="mt-4 font-semibold">{GYM.hours}</p>
          <p className="text-sm text-muted">{GYM.closed}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border">
          <h2 className="font-display text-2xl font-bold">Hubungi kami</h2>
          <a href={GYM.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-[#22c55e] px-4 py-3 text-center font-semibold text-white hover:brightness-110">
            WhatsApp {GYM.whatsapp}
          </a>
          <a href={GYM.instagramUrl} target="_blank" rel="noreferrer" className="rounded-xl px-4 py-3 text-center font-semibold ring-1 ring-border hover:bg-surface-2">
            Instagram {GYM.instagram}
          </a>
          <p className="text-xs text-muted">Pertanyaan soal paket, pembayaran, atau refund: hubungi WhatsApp di atas pada jam buka.</p>
        </div>
      </section>
    </PublicShell>
  );
}
