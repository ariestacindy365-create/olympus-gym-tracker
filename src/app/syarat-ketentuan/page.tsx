import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/public/PublicShell";
import { GYM } from "@/lib/gymInfo";

export const metadata: Metadata = { title: "Syarat & Ketentuan · OLYMPUS Lifting Club" };

export default function TermsPage() {
  return (
    <PolicyPage title="Syarat & Ketentuan" updated="25 November 2026">
      <p>
        Syarat &amp; ketentuan ini berlaku untuk semua member dan pengunjung {GYM.name} ({GYM.address}), termasuk pemakaian aplikasi member Olympus dan pembelian
        paket. Dengan membeli paket atau memakai fasilitas gym, kamu dianggap menyetujui ketentuan ini.
      </p>
      <h2>1. Akun member</h2>
      <ul>
        <li>Satu akun untuk satu orang. Data yang diisi (nama, email, nomor WhatsApp, tanggal lahir) harus benar.</li>
        <li>Jaga kerahasiaan PIN. Aktivitas dari akunmu menjadi tanggung jawabmu.</li>
      </ul>
      <h2>2. Paket & pembayaran</h2>
      <ul>
        <li>Harga paket tercantum di halaman utama dan di menu Paket aplikasi, dalam Rupiah.</li>
        <li>
          Pembayaran dapat dilakukan dengan QRIS, virtual account bank (diproses oleh Midtrans), transfer bank dengan unggah bukti, atau langsung di meja admin
          (tunai, kartu debit/kredit, QRIS).
        </li>
        <li>Paket aktif otomatis setelah pembayaran QRIS / virtual account berhasil, atau setelah transfer manual diverifikasi admin.</li>
        <li>Paket bersifat pribadi dan tidak dapat dipindahtangankan.</li>
        <li>
          Pengembalian dana mengikuti <Link href="/kebijakan-refund" className="font-semibold text-accent">Kebijakan Refund &amp; Pembatalan</Link>.
        </li>
      </ul>
      <h2>3. Kelas & jam operasional</h2>
      <ul>
        <li>Gym buka {GYM.hours}. {GYM.closed}.</li>
        <li>Jadwal kelas dan kuota dapat berubah; perubahan diumumkan di aplikasi atau Instagram {GYM.instagram}.</li>
        <li>Untuk kelas yang memerlukan booking, datang tepat waktu dan batalkan dari aplikasi bila berhalangan.</li>
      </ul>
      <h2>4. Kesehatan & keselamatan</h2>
      <ul>
        <li>Latihan fisik memiliki risiko cedera. Kamu berlatih atas kesadaran dan tanggung jawab sendiri.</li>
        <li>Beri tahu coach tentang cedera, kondisi medis, atau kehamilan sebelum latihan. Ikuti arahan coach dan pakai alat sesuai fungsinya.</li>
        <li>Rapikan alat setelah dipakai. Gunakan pakaian dan sepatu olahraga.</li>
      </ul>
      <h2>5. Perilaku</h2>
      <p>Hormati sesama member dan staf. Pengelola berhak menangguhkan atau mengakhiri keanggotaan karena pelanggaran berat, tanpa pengembalian dana.</p>
      <h2>6. Perubahan ketentuan</h2>
      <p>Ketentuan ini dapat diperbarui sewaktu-waktu. Versi terbaru selalu tersedia di halaman ini.</p>
      <h2>7. Kontak</h2>
      <p>
        WhatsApp <a href={GYM.whatsappUrl} className="font-semibold text-accent">{GYM.whatsapp}</a> · Instagram{" "}
        <a href={GYM.instagramUrl} className="font-semibold text-accent">{GYM.instagram}</a>
      </p>
    </PolicyPage>
  );
}
