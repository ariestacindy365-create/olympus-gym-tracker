# Perlindungan data latihan

- Riwayat menampilkan setiap set, termasuk saat grafik diringkas per hari.
  Konfirmasi menunjukkan gerakan, tanggal, nomor set, dan dampak **1 set**.
  Tombol Batalkan tersedia selama 8 detik; penghapusan server baru berjalan
  setelah jeda itu. Meninggalkan komponen selama jeda membatalkan penghapusan.
- Set offline tetap di localStorage bila tersedia. Jika quota penuh, akses
  ditolak, atau data rusak, payload dipertahankan di memori dan peringatan
  ditampilkan. Isian tidak dikosongkan dan tersedia unduh cadangan JSON.
  Menutup halaman diperingatkan selama ada isian/antrean belum terkirim.
  Memori tidak dapat bertahan jika browser dimatikan paksa; unduh cadangan
  atau kirim ke server sebelum menutup ketika storage bermasalah.
- Pengiriman antrean diserialkan. HTTP gagal tidak membuang entri. Set yang
  sudah dikirim tidak muncul kembali dalam memori meski pembersihan disk gagal.
- Coach dapat mencatat reps, detik, meter, lap, kalori dan jumlah per sisi,
  untuk member maupun latihan pribadi. Hasil edit mempertahankan unit.
- Editor kelas dan program pribadi menyimpan draft lokal per akun. Draft
  berisi versi dasar server, bukan sekadar isi program. Perubahan lokal tetap
  tersedia setelah konflik, dapat diunduh, dan tidak di-rebase secara diam-diam.
- PUT program wajib menyertakan expectedVersion (ISO updatedAt, null jika
  belum ada program). Server mengunci program dalam transaksi, memeriksa
  versi, lalu memperbarui timestamp secara monoton. Versi lama menghasilkan
  HTTP 409 sebelum mengganti program. Klien tanpa token memperoleh HTTP 428.
  Restore snapshot menggunakan kunci yang sama dan mengubah versi sehingga
  editor yang sudah terbuka tidak dapat menimpa hasil restore.
- Tidak perlu perubahan schema database untuk perlindungan ini.

Verifikasi: `npm run test:coach-training`, `npm run test:workout-inputs`,
`npm run test:training-resilience`, TypeScript, ESLint file berubah, build
produksi, dan interaksi browser pada data tiruan (draft, konflik, satuan,
dan pembatalan penghapusan). Pengujian API memakai database/session tiruan;
tidak mengubah data member produksi.
