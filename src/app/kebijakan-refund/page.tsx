import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/public/PublicShell";
import { GYM } from "@/lib/gymInfo";

export const metadata: Metadata = { title: "Kebijakan Refund & Pembatalan · OLYMPUS Lifting Club" };

export default function RefundPolicyPage() {
  return (
    <PolicyPage title="Kebijakan Refund & Pembatalan" updated="25 November 2026">
      <h2>1. Paket tidak dapat dikembalikan</h2>
      <p>
        Paket membership, kelas, dan personal training yang sudah dibeli dan dibayar <strong>tidak dapat dikembalikan (non-refundable)</strong> dan tidak dapat
        ditukar dengan uang tunai, baik sebagian maupun seluruhnya, termasuk bila paket tidak dipakai atau tidak dipakai sampai habis.
      </p>
      <h2>2. Pengecualian: kesalahan pembayaran</h2>
      <p>Dana akan dikembalikan penuh bila terjadi:</p>
      <ul>
        <li>pembayaran ganda untuk pesanan yang sama;</li>
        <li>kelebihan bayar dari nominal tagihan;</li>
        <li>pembayaran berhasil tetapi paket tidak dapat diaktifkan karena kesalahan sistem kami.</li>
      </ul>
      <p>
        Ajukan lewat WhatsApp <a href={GYM.whatsappUrl} className="font-semibold text-accent">{GYM.whatsapp}</a> dengan bukti pembayaran. Pengembalian diproses ke
        rekening atau e-wallet pembayar dalam 7 hari kerja setelah data lengkap.
      </p>
      <h2>3. Pembatalan sebelum membayar</h2>
      <p>
        Pesanan yang belum dibayar dapat dibatalkan kapan saja dari menu Paket di aplikasi. Kode QRIS dan nomor virtual account yang belum dibayar akan kedaluwarsa
        dengan sendirinya.
      </p>
      <h2>4. Masa aktif & sesi</h2>
      <p>
        Masa aktif paket berjalan sejak tanggal mulai yang tertera di aplikasi. Sesi atau masa aktif yang tidak terpakai sampai paket berakhir akan hangus dan
        tidak dapat diperpanjang, kecuali atas persetujuan pengelola gym (misalnya karena sakit dengan surat keterangan dokter).
      </p>
      <h2>5. Kontak</h2>
      <p>
        {GYM.name} · {GYM.address} · WhatsApp {GYM.whatsapp}. Lihat juga <Link href="/syarat-ketentuan" className="font-semibold text-accent">Syarat &amp; Ketentuan</Link>.
      </p>
    </PolicyPage>
  );
}
