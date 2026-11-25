// Public business details of the gym, shown on the website pages (landing,
// terms, refund and privacy policy) that the payment provider reviews.

export const GYM = {
  name: "OLYMPUS Lifting Club",
  tagline: "Olahraga jadi seru",
  address: "Perumahan Ogan Permata Indah, Jl. OPI Raya Blok BA-3D, Sungai Kedukan, Kec. Rambutan, Kab. Banyuasin, Sumatera Selatan 30257",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("OLYMPUS Lifting Club, Jl. OPI Raya Blok BA-3D, Sungai Kedukan, Rambutan, Banyuasin, Sumatera Selatan 30257"),
  hours: "Senin – Sabtu, 07.00 – 20.00 WIB",
  closed: "Minggu & hari libur nasional: tutup",
  whatsapp: "0821-2475-7693",
  whatsappUrl: "https://wa.me/6282124757693",
  instagram: "@olympusliftclub",
  instagramUrl: "https://www.instagram.com/olympusliftclub",
} as const;

/** "6 bulan", "30 hari", "tanpa batas waktu" for a package. */
export function packageDuration(p: { durationMonths: number | null; durationDays: number | null; kind: string | null }): string | null {
  if (p.kind === "NO_EXPIRY") return "tanpa batas waktu";
  if (p.durationMonths) return `${p.durationMonths} bulan`;
  if (p.durationDays) return `${p.durationDays} hari`;
  return null;
}
