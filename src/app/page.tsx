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

/** A real photo from the gym (public/web), with a soft background while it loads. */
function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`bg-surface-2 object-cover ${className}`} />;
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

  const paths: { title: string; text: string; group: string; src: string; alt: string }[] = [
    { title: "Bootcamp Class", text: "Kelas berkelompok dengan program mingguan dari coach. Cocok untuk mulai.", group: "Bootcamp Class", src: "/web/bootcamp.jpg", alt: "Member Olympus di kelas bootcamp" },
    { title: "Private Training", text: "Satu coach untuk kamu sendiri, program disusun sesuai tujuanmu.", group: "Private Training", src: "/web/private.jpg", alt: "Coach membimbing member saat private training" },
    { title: "Couple Training", text: "Latihan berdua dengan satu coach. Untuk pasangan, teman, atau saudara.", group: "Couple Training", src: "/web/couple.jpg", alt: "Dua member Olympus setelah latihan" },
    { title: "Private Group", text: "Kelas privat untuk grup sampai 5 orang, jadwal menyesuaikan grupmu.", group: "Private Group Class", src: "/web/group.jpg", alt: "Satu kelas Olympus berpose bersama" },
  ];

  const reasons: [string, string][] = [
    ["Mulai dari nol", "Coach mengajarkan gerakan dasar dari awal: cara berdiri, cara memegang beban, cara bernapas. Mulai dengan beban ringan dulu."],
    ["Selalu diawasi coach", "Teknikmu diperhatikan dan dikoreksi langsung di setiap set. Beban naik pelan-pelan sesuai kemampuan, supaya kuat tanpa cedera."],
    ["Tinggal ikuti program", "Tidak perlu bingung mau latihan apa. Gerakan, set, dan bebannya sudah disiapkan coach, tampil di layar kelas dan di aplikasi."],
    ["Teman yang menyemangati", "Semua member pernah jadi pemula. Suasananya santai, saling semangati, dan setiap rekor baru dirayakan bersama."],
    ["Progres kelihatan", "Setiap set dan beban tercatat di HP, jadi kamu bisa lihat sendiri kekuatanmu naik dari minggu ke minggu."],
    ["Boleh tanya dulu", "Masih ragu? Chat kami di WhatsApp untuk tanya paket dan jadwal yang paling pas sebelum mulai."],
  ];
  const label = "text-sm font-semibold text-accent";
  const h2 = "mt-2 text-3xl font-bold sm:text-4xl";

  return (
    <PublicShell>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.05fr_1fr] md:py-16">
        <div className="flex flex-col gap-5">
          <p className={label}>{GYM.name} · Banyuasin</p>
          <h1 className="text-5xl font-bold leading-[1.05] sm:text-6xl">
            Olahraga <span className="text-accent">jadi seru.</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-muted">
            Kelas lifting dan bootcamp yang ramah untuk pemula. Latihan terprogram bersama coach, ditemani teman satu kelas, dan progresmu tercatat di HP.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={GYM.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-2">
              Tanya lewat WhatsApp
            </a>
            <a href="#paket" className="rounded-md border border-border px-5 py-3 font-semibold hover:border-accent hover:text-accent">
              Lihat paket &amp; harga
            </a>
          </div>
          <p className="text-sm text-muted">{GYM.hours}</p>
        </div>
        <Photo src="/web/hero.jpg" alt="Coach Olympus membimbing member yang tertawa saat latihan" className="aspect-[4/5] w-full rounded-xl md:aspect-auto md:h-[clamp(24rem,calc(100svh-9rem),36rem)]" />
      </section>

      {/* Why Olympus */}
      <section id="kenapa" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="grid gap-8 md:grid-cols-2 md:items-end">
            <div>
              <p className={label}>Kenapa Olympus</p>
              <h2 className={h2}>Ramah untuk pemula, seru untuk semua.</h2>
            </div>
            <p className="leading-relaxed text-muted">
              Belum pernah angkat beban? Tidak apa-apa. Banyak member Olympus juga mulai dari nol. Coach menemani dari gerakan pertama, bebannya disesuaikan
              kemampuanmu, dan teman satu kelas ikut menyemangati.
            </p>
          </div>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map(([title, text]) => (
              <div key={title} className="border-t-2 border-accent pt-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
          <Photo src="/web/why.jpg" alt="Member Olympus berpose bersama setelah kelas" className="mt-12 aspect-[16/9] w-full rounded-xl sm:aspect-[21/9]" />
        </div>
      </section>

      {/* Choose your path */}
      <section id="program" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <p className={label}>Program</p>
          <h2 className={h2}>Latihan sesuai tujuanmu</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {paths.map((p) => {
              const price = from(p.group);
              return (
                <a key={p.title} href="#paket" className="group flex flex-col gap-3">
                  <Photo src={p.src} alt={p.alt} className="aspect-[4/3] w-full rounded-lg transition group-hover:opacity-90" />
                  <div>
                    <h3 className="font-semibold group-hover:text-accent">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{p.text}</p>
                    {price != null && <p className="mt-2 text-sm font-semibold">Mulai {formatRupiah(price)}</p>}
                  </div>
                </a>
              );
            })}
          </div>
          <a href={GYM.instagramUrl} target="_blank" rel="noreferrer" className="mt-8 inline-block text-sm font-semibold text-accent hover:underline">
            Lihat suasana kelas di Instagram {GYM.instagram} →
          </a>
        </div>
      </section>

      {/* Packages & prices */}
      <section id="paket" className="scroll-mt-20 border-t border-border bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <p className={label}>Paket &amp; harga</p>
          <h2 className={h2}>Pilih paketmu</h2>
          <p className="mt-2 text-muted">Harga dalam Rupiah. Paket aktif setelah pembayaran dikonfirmasi.</p>
          {packages.length === 0 && <p className="mt-6 text-muted">Daftar paket sedang diperbarui. Hubungi kami lewat WhatsApp untuk info harga.</p>}
          {[...groups.entries()].map(([group, items]) => (
            <div key={group} className="mt-10">
              <h3 className="text-xl font-semibold">{group}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => {
                  const duration = packageDuration(p);
                  return (
                    <div key={p.id} className="flex flex-col gap-1 rounded-lg border border-border bg-white p-5">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-2xl font-bold text-accent">{formatRupiah(p.price)}</p>
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
          <div className="mt-12 rounded-lg border border-border bg-white p-6">
            <h3 className="text-xl font-semibold">Cara membeli</h3>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
              <li>Buat akun member di aplikasi Olympus (tombol &quot;Masuk member&quot; → &quot;Buat akun member&quot;).</li>
              <li>Pilih paket di menu Paket, lalu bayar dengan QRIS (semua e-wallet &amp; m-banking), virtual account bank, atau transfer bank.</li>
              <li>Paket aktif otomatis setelah pembayaran QRIS / virtual account berhasil; transfer manual aktif setelah diverifikasi admin.</li>
              <li>Bisa juga membeli langsung di meja admin gym (tunai, kartu debit/kredit, atau QRIS).</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Location & contact */}
      <section id="lokasi" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className={label}>Lokasi</p>
            <h2 className={h2}>Lokasi &amp; jam buka</h2>
            <p className="mt-4 leading-relaxed">{GYM.address}</p>
            <a href={GYM.mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-accent hover:underline">
              Buka di Google Maps →
            </a>
            <p className="mt-6 font-semibold">{GYM.hours}</p>
            <p className="text-sm text-muted">{GYM.closed}</p>
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-lg bg-accent/5 p-6 ring-1 ring-accent/15">
            <h2 className="text-2xl font-bold">Masih ragu? Tanya dulu.</h2>
            <p className="text-muted">Soal paket, jadwal kelas, pembayaran, atau refund, chat kami di jam buka.</p>
            <a href={GYM.whatsappUrl} target="_blank" rel="noreferrer" className="mt-2 rounded-md bg-accent px-4 py-3 text-center font-semibold text-white hover:bg-accent-2">
              WhatsApp {GYM.whatsapp}
            </a>
            <a href={GYM.instagramUrl} target="_blank" rel="noreferrer" className="rounded-md border border-border bg-white px-4 py-3 text-center font-semibold hover:border-accent hover:text-accent">
              Instagram {GYM.instagram}
            </a>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
