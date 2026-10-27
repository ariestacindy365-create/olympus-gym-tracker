# Latihan pribadi coach

Coach membuka **Latihan Saya** dari navigasi atau dashboard (`/coach/latihan`).
Akun tetap COACH; tidak perlu membuat akun member.

1. Pilih **Buat program**, tambahkan sesi (misalnya Upper, Lower, atau nama hari),
   pilih gerakan dari kamus, lalu tentukan target set dan repetisi.
2. Simpan program, pilih sesi/gerakan, isi beban kg dan repetisi, lalu simpan
   setiap set. Beban 0 kg berarti bodyweight. Desimal titik dan koma didukung.
3. Beban dan repetisi dari latihan terakhir tersedia sebagai acuan.
4. Lihat hasil hari ini atau Riwayat untuk mengedit/menghapus set dan catatan.
   Riwayat menampilkan hingga 500 set terbaru; acuan latihan sebelumnya
   tetap mencari sesi terakhir setiap gerakan di seluruh riwayat.

Kamus gerakan lengkap tersedia untuk dipilih, tetapi hanya gerakan yang
digunakan yang ditambahkan ke daftar pencatatan beban.

Program pribadi disimpan pada `CoachPersonalProgram`, terpisah dari
`TrainingProgram` kelas. Set dan personal record menggunakan akun coach
sendiri. Endpoint selalu mengambil identitas dari sesi. Latihan pribadi
coach tidak masuk Live Board, statistik member, leaderboard member, atau
feed kelas. Mengubah program tidak menghapus hasil latihan.

## Penerapan schema

Proyek ini memakai `prisma db push`, bukan migration SQL. Model baru hanya
menambah tabel dengan relasi ke User. Jalankan `npx prisma generate` setelah
mengambil perubahan. Deployment production menjalankan `prisma db push`
melalui `vercel-build`; preview memerlukan database terpisah dengan schema
yang sudah diperbarui. Jangan menjalankan seed terhadap database asli.

## Verifikasi

- `npm run test:coach-training`: 12 pemeriksaan handler API terisolasi,
  menggunakan session/database tiruan dan logika validasi/PR asli.
- `npx prisma validate`
- `npx next typegen && npx tsc --noEmit`
- ESLint pada file yang berubah.

Suara `ClassTimer` menggunakan beep seperti sebelum perubahan peluit:
beep pendek saat hitung mundur, beep pergantian fase, dan beep panjang saat selesai.
