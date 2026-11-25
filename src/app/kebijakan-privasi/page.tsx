import type { Metadata } from "next";
import { PolicyPage } from "@/components/public/PublicShell";
import { GYM } from "@/lib/gymInfo";

export const metadata: Metadata = { title: "Kebijakan Privasi · OLYMPUS Lifting Club" };

export default function PrivacyPage() {
  return (
    <PolicyPage title="Kebijakan Privasi" updated="25 November 2026">
      <p>Kebijakan ini menjelaskan data apa yang dikumpulkan {GYM.name} lewat aplikasi member Olympus, untuk apa, dan bagaimana data itu dijaga.</p>
      <h2>1. Data yang kami kumpulkan</h2>
      <ul>
        <li>Data akun: nama, email, nomor WhatsApp, tanggal lahir, dan PIN (disimpan sebagai hash, tidak bisa dibaca siapa pun).</li>
        <li>Data latihan: set, beban, repetisi, rekor pribadi, kehadiran kelas, dan ukuran tubuh yang kamu isi sendiri.</li>
        <li>Data pembelian: paket, nominal, cara bayar, dan bukti transfer yang kamu unggah.</li>
      </ul>
      <h2>2. Pembayaran</h2>
      <p>
        Pembayaran QRIS dan virtual account diproses oleh Midtrans. Kami tidak menyimpan data kartu atau rekening bank; yang kami terima dari Midtrans hanya status
        pembayaran dan nomor transaksinya.
      </p>
      <h2>3. Pemakaian data</h2>
      <ul>
        <li>Mengelola keanggotaan, paket, booking kelas, dan pembayaran.</li>
        <li>Menampilkan progres latihan, program dari coach, dan pengingat lewat notifikasi atau WhatsApp.</li>
        <li>Menampilkan nama dan rekor di papan peringkat atau layar kelas, kecuali kamu menyembunyikannya di pengaturan Akun.</li>
      </ul>
      <h2>4. Berbagi data</h2>
      <p>Data tidak dijual. Data hanya dapat dilihat oleh coach dan admin gym sesuai tugasnya, dan oleh penyedia layanan yang kami pakai (hosting, pembayaran) untuk menjalankan aplikasi.</p>
      <h2>5. Penyimpanan & penghapusan</h2>
      <p>Data disimpan selama kamu menjadi member. Untuk mengubah atau menghapus data akunmu, hubungi kami lewat WhatsApp.</p>
      <h2>6. Kontak</h2>
      <p>
        {GYM.name} · {GYM.address} · WhatsApp <a href={GYM.whatsappUrl} className="font-semibold text-accent">{GYM.whatsapp}</a>
      </p>
    </PolicyPage>
  );
}
