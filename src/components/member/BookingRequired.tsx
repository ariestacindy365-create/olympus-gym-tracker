import Link from "next/link";

const BTN = "inline-flex min-h-12 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition";

/** Shown instead of the Latihan page until the member has a class booked that day. */
export function BookingRequired({ waitlist, canBook, pastDay }: { waitlist: boolean; canBook: boolean; pastDay: string | null }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{pastDay ? "Isi latihan yang terlewat" : "Latihan hari ini"}</p>
        <h2 className="font-display text-2xl font-bold">
          {pastDay ? "Tidak ada kelas yang kamu booking di hari itu" : waitlist ? "Kamu masih di daftar tunggu" : "Booking kelas dulu ya"}
        </h2>
        <p className="text-sm text-muted">
          {pastDay
            ? "Latihan hanya bisa diisi untuk hari kamu ikut kelas."
            : waitlist
              ? "Halaman Latihan terbuka begitu kamu dapat tempat. Kamu akan dapat notifikasi."
              : "Halaman Latihan terbuka setelah kamu booking kelas hari ini."}
        </p>
      </div>
      {pastDay ? (
        <Link href="/member/dashboard" className={`${BTN} bg-accent text-white`}>
          Kembali ke hari ini
        </Link>
      ) : canBook ? (
        <Link href="/member/booking" className={`${BTN} bg-accent text-white`}>
          {waitlist ? "Lihat booking" : "Booking kelas"}
        </Link>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">Belum ada paket aktif untuk booking kelas.</p>
          <Link href="/member/paket" className={`${BTN} bg-accent text-white`}>
            Beli paket
          </Link>
          <Link href="/member/booking" className={`${BTN} border border-border`}>
            Lihat jadwal kelas
          </Link>
        </div>
      )}
      <p className="text-xs text-muted">Sudah di gym tapi belum booking? Minta admin menambahkanmu ke kelas, lalu muat ulang halaman ini.</p>
    </div>
  );
}
