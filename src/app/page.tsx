import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHomePath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/packages";
import { GYM, packageDuration } from "@/lib/gymInfo";
import { OlympusLogo } from "@/components/ui/OlympusLogo";
import { PublicShell } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "OLYMPUS Lifting Club · Gym di Sungai Kedukan, Banyuasin",
  description: "Gym kelas bootcamp, lifting, dan personal training di Ogan Permata Indah, Banyuasin. Lihat paket membership, harga, lokasi, dan jam buka.",
};

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

  return (
    <PublicShell>
      <section className="bg-nav-bg text-nav-foreground [background-image:radial-gradient(40rem_20rem_at_50%_0%,rgb(37_99_235/0.45),transparent)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4 py-16 text-center">
          <OlympusLogo height={72} variant="light" />
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-nav-muted">{GYM.tagline}</p>
          <h1 className="max-w-2xl font-display text-3xl font-bold leading-tight sm:text-5xl">Gym kelas bootcamp, lifting &amp; personal training di Banyuasin</h1>
          <p className="max-w-xl text-nav-muted">
            Latihan terprogram bersama coach, catat beban dan rekor pribadimu di aplikasi Olympus, dan pantau progresmu dari minggu ke minggu.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#paket" className="rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-2">Lihat paket &amp; harga</a>
            <a href={GYM.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-white/10 px-5 py-3 font-semibold ring-1 ring-white/25 hover:bg-white/20">
              Tanya via WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-12 sm:grid-cols-3">
        {[
          ["🏋️", "Kelas bootcamp", "Kelas berkelompok dengan program mingguan dari coach: kekuatan, kondisi fisik, dan teknik angkatan."],
          ["🎯", "Personal training", "Latihan privat atau semi-privat dengan coach, program disesuaikan dengan tujuanmu."],
          ["📈", "Aplikasi member", "Catat set & beban, lihat rekor pribadi, booking kelas, dan beli paket langsung dari HP."],
        ].map(([icon, title, text]) => (
          <div key={title} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <p className="text-3xl">{icon}</p>
            <h2 className="mt-2 font-display text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section id="paket" className="scroll-mt-20 bg-surface-2">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="font-display text-3xl font-bold">Paket &amp; harga</h2>
          <p className="mt-1 text-sm text-muted">Harga dalam Rupiah. Paket aktif setelah pembayaran dikonfirmasi.</p>
          {packages.length === 0 && <p className="mt-6 text-muted">Daftar paket sedang diperbarui. Hubungi kami lewat WhatsApp untuk info harga.</p>}
          {[...groups.entries()].map(([group, items]) => (
            <div key={group} className="mt-8">
              <h3 className="font-display text-xl font-bold">{group}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => {
                  const duration = packageDuration(p);
                  return (
                    <div key={p.id} className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 shadow-card">
                      <p className="font-semibold">{p.name}</p>
                      <p className="font-display text-2xl font-bold text-accent">{formatRupiah(p.price)}</p>
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
          <div className="mt-10 rounded-2xl border border-border bg-surface p-5">
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

      <section id="lokasi" className="mx-auto grid max-w-5xl scroll-mt-20 gap-6 px-4 py-12 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-bold">Lokasi &amp; jam buka</h2>
          <p className="mt-3">{GYM.address}</p>
          <a href={GYM.mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-accent hover:underline">
            Buka di Google Maps →
          </a>
          <p className="mt-4 font-semibold">{GYM.hours}</p>
          <p className="text-sm text-muted">{GYM.closed}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="font-display text-2xl font-bold">Hubungi kami</h2>
          <a href={GYM.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-[#22c55e] px-4 py-3 text-center font-semibold text-white hover:brightness-110">
            WhatsApp {GYM.whatsapp}
          </a>
          <a href={GYM.instagramUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-border px-4 py-3 text-center font-semibold hover:bg-surface-2">
            Instagram {GYM.instagram}
          </a>
          <p className="text-xs text-muted">Pertanyaan soal paket, pembayaran, atau refund: hubungi WhatsApp di atas pada jam buka.</p>
        </div>
      </section>
    </PublicShell>
  );
}
