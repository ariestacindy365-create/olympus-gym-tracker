import { createHash } from 'node:crypto';
// Anti-rollback guard: fails when a feature that is live goes missing, e.g.
// a change made from an older copy of the code that quietly drops work.
//
// - tests/feature-routes.json: every page and API route that is live. A
//   route may be added freely; removing one on purpose means removing it
//   from that list in the same PR.
// - FEATURES below: a marker in the code for each feature, plus a few
//   behaviour checks. Add a line when a feature ships.
import { build } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const failures = [];

const routes = JSON.parse(readFileSync(join(root, 'tests/feature-routes.json'), 'utf8'));
for (const r of routes) {
  if (!existsSync(join(root, 'src/app', r))) failures.push(`Halaman/API hilang: src/app/${r}`);
}

// [feature, file, text that must be in it]
const FEATURES = [
  ['Selebrasi PR barbell di slideshow coach', 'src/components/shared/SlideShow.tsx', 'celebratePRs'],
  ['Selebrasi PR barbell di slideshow coach', 'src/components/coach/SlideShowButton.tsx', 'celebratePRs'],
  ['Selebrasi PR: karakter + papan PR', 'src/components/shared/PRLifter.tsx', 'prc-body'],
  ['Selebrasi PR: karakter mengikuti pilihan member', 'src/app/api/coach/pr-events/route.ts', 'storyCharacter'],
  ['Layar share: kartu geser + satu baris tombol', 'src/components/member/DayFinishFlow.tsx', '<ShareCards'],
  ['Layar share: latar Biru / Bening / Terang', 'src/components/member/ShareCards.tsx', 'fillBackdrop'],
  ['Kartu share potret 1080×1440', 'src/lib/shareCards.ts', 'CARD_H = 1440'],
  ['Kartu share Ringkasan 2×2', 'src/components/member/DayFinishFlow.tsx', 'kind: "summary"'],
  ['Kartu share Total angkatan', 'src/components/member/DayFinishFlow.tsx', 'id: "total"'],
  ['Tombol Salin stiker untuk Story (Bening)', 'src/components/member/ShareCards.tsx', 'Salin stiker untuk Story'],
  ['Bagikan latihan bisa ditutup dan dibuka lagi', 'src/components/member/DayFinishFlow.tsx', 'setSharing(true)'],
  ['Kartu yang dibagikan = kartu di tengah layar', 'src/components/member/ShareCards.tsx', 'nearest the middle'],
  ['Tombol share ringkas: video di Lainnya', 'src/components/member/ShareCards.tsx', 'setMoreOpen'],
  ['Tombol Teks membuka menu bagikan HP', 'src/components/member/ShareCards.tsx', 'navigator.share({ text: shareText })'],
  ['Pop-up Yakin sudah selesai? sebelum simpan latihan', 'src/components/member/DayFinishFlow.tsx', 'Yakin sudah selesai?'],
  ['Durasi latihan otomatis 1 jam', 'src/components/member/DayFinishFlow.tsx', 'const durationMin = DEFAULT_WORKOUT_MINUTES'],
  ['Pop-up tanggal lahir wajib saat member login', 'src/app/member/layout.tsx', 'needBirthDate={!user.birthDate}'],
  ['Pop-up hidupkan notifikasi', 'src/components/member/LoginPrompts.tsx', 'Hidupkan notifikasi'],
  ['Ubah tanggal lahir di Akun', 'src/app/member/account/page.tsx', '<BirthDateSetting'],
  ['Impor member & membership dari FitQuarter', 'src/app/leads/impor/page.tsx', '<FitQuarterImport'],
  ['Membership tertaut otomatis saat login / daftar', 'src/app/api/auth/login/route.ts', 'claimImportedMember'],
  ['Membership di halaman Akun member', 'src/app/member/account/page.tsx', '<MembershipList'],
  ['Booking kelas member (7 hari, daftar tunggu, batal)', 'src/components/member/BookingBoard.tsx', 'Daftar tunggu'],
  ['Kartu check-in member (QR)', 'src/app/member/booking/page.tsx', '<CheckInCard'],
  ['Meja admin: check-in & daftar peserta kelas', 'src/app/leads/kelas/page.tsx', '<ClassRoster'],
  ['Scan kartu member di mana saja = check-in', 'src/components/leads/QuickSaleScanner.tsx', 'MEMBER_CODE.test'],
  ['Owner atur kuota per kelas', 'src/app/leads/kelas/page.tsx', '<QuotaSetting'],
  ['Coach lihat peserta kelas', 'src/app/coach/kelas/page.tsx', 'Peserta kelas'],
  ['Program hari ini mengikuti kelas yang dibooking', 'src/lib/memberClass.ts', 'booking.sessionId'],
  ['Member beli paket lewat transfer + bukti', 'src/components/member/PackageShop.tsx', 'Kirim bukti transfer'],
  ['Admin verifikasi transfer (checklist)', 'src/components/leads/PackageDesk.tsx', 'Cek di mutasi rekening'],
  ['Jual paket di meja: tunai / debit / kartu kredit / QRIS / transfer', 'src/components/leads/PackageDesk.tsx', 'KARTU_KREDIT'],
  ['Owner atur rekening tujuan transfer', 'src/app/leads/paket/page.tsx', '<BankInfoForm'],
  ['Pricelist 2026 di aplikasi', 'prisma/migrations/20261117072958_add_membership_orders/migration.sql', 'Bootcamp Unlimited 1 Bulan'],
  ['Tautan Versi video di bawah kartu Total angkatan / Kalori', 'src/components/member/ShareCards.tsx', 'onVideo(current.video!)'],
  ['Saran beban di tiap gerakan program', 'src/components/member/TodayWorkoutPlan.tsx', 'Saran beban'],
  ['Kartu share Fokus otot', 'src/components/member/DayFinishFlow.tsx', 'id: "fokus"'],
  ['Kartu share Gerakan', 'src/components/member/DayFinishFlow.tsx', 'id: "gerakan"'],
  ['Kartu share Minggu ini', 'src/components/member/DayFinishFlow.tsx', 'id: "minggu"'],
  ['Kartu Rekor baru dengan rekor lama', 'src/components/member/DayFinishFlow.tsx', 'Rekor lama'],
  ['Story foto (kolase + stiker)', 'src/components/member/PhotoStory.tsx', 'Bagikan ke Story'],
  ['Tombol Foto + stiker di layar share', 'src/components/member/ShareCards.tsx', 'Foto + stiker'],
  ['Set lain hari ini di layar latihan', 'src/components/member/TodayWorkoutPlan.tsx', 'Set lain hari ini'],
  ['Catatan PT dari sesi sebelumnya', 'src/components/coach/PtSessionLogger.tsx', 'previous['],
  ['Selebrasi PR: tombol suara 🔊/🔇', 'src/components/shared/SlideShow.tsx', 'togglePrSound'],
  ['Hapus set tetap jalan saat pindah halaman', 'src/components/ui/UndoDeleteButton.tsx', 'pagehide'],
  ['Hapus set langsung di layar latihan hari ini', 'src/components/member/TodayWorkoutPlan.tsx', 'removeSet'],
  ['Tap ✓ cepat beruntun tersimpan semua (antrean)', 'src/components/member/TodayWorkoutPlan.tsx', 'sendQueue'],
  ['Set offline disimpan di HP sampai ada sinyal', 'src/components/member/TodayWorkoutPlan.tsx', 'addPending'],
  ['Jumlah baris = jumlah set di slide', 'src/lib/todayPlan.ts', 'schemeUsesSets'],
  ['Gerakan tanpa beban / TABATA tidak perlu dicatat', 'src/lib/todayPlan.ts', 'noInput'],
  ['Rotasi program aman saat dibuat bersamaan', 'src/lib/programHistory.ts', 'createEachSkippingDuplicates'],
  ['Versi program (cegah saling timpa antar coach)', 'src/app/api/coach/programs/[weekNumber]/route.ts', 'expectedVersion'],
  ['Latihan Saya (coach)', 'src/app/coach/latihan/page.tsx', ''],
  ['Bunyi beep timer kelas', 'src/components/shared/ClassTimer.tsx', 'beep'],
  ['Nama hari dipilih dari daftar SENIN–SABTU', 'src/components/coach/SortableDayBlock.tsx', 'PROGRAM_DAYS'],
  ['+ Tambah hari lanjut ke hari berikutnya', 'src/components/coach/ProgramEditor.tsx', 'nextProgramDay'],
  ['+ Tambah minggu (sampai 12) per coach', 'src/components/coach/ProgramEditor.tsx', 'Tambah minggu'],
  ['Urutan minggu per coach', 'src/lib/programHistory.ts', 'coachProgramCycle'],
  ['Pakai Minggu N minggu ini, per coach', 'src/app/api/coach/programs/override/route.ts', 'coachWeekOverride'],
  ['Menu PT di coach', 'src/app/coach/layout.tsx', '/coach/pt'],
  ['Cari member di halaman PT', 'src/components/coach/PtManager.tsx', 'Ketik nama member'],
  ['Tombol Lepas dari PT', 'src/components/coach/PtPackageView.tsx', 'Lepas dari PT'],
  ['Catat sesi berdua (kolom per orang)', 'src/components/coach/PtSessionLogger.tsx', 'ptSessionId'],
  ['Latihan klien PT = sesi PT', 'src/app/member/dashboard/page.tsx', 'getPtTodayPlan'],
  ['Kartu Klien PT kamu', 'src/app/member/dashboard/page.tsx', 'PtClientCard'],
  ['Lencana PT di daftar member', 'src/components/coach/MemberManager.tsx', 'Klien PT'],
  ['PT tidak masuk Rekap Kelas', 'src/lib/classRecap.ts', 'ptMemberIdsOn'],
  ['PT tidak dirayakan di slideshow kelas', 'src/app/api/coach/pr-events/route.ts', 'ptMemberIdsOn'],
  ['Menu coach ringkas + Lainnya ▾', 'src/app/coach/layout.tsx', 'more={MORE}'],
  ['Menu bawah di HP untuk coach, admin, owner (+ Lainnya)', 'src/app/coach/layout.tsx', '<BottomNav'],
  ['Menu bawah di HP untuk coach, admin, owner (+ Lainnya)', 'src/app/leads/layout.tsx', '<BottomNav'],
  ['Menu member: Program, Peringkat, Notifikasi lewat Lainnya', 'src/components/member/MemberBottomNav.tsx', '/member/leaderboard'],
  ['Feed menghitung otot dari set terbaru per ronde', 'src/lib/feed.ts', 'programRounds'],
  ['Volume & PR di feed dari set terbaru', 'src/lib/feed.ts', 'totalVolume: s.totalVolume'],
  ['Jadwal sesi PT dari coach, terlihat oleh klien', 'src/components/member/PtClientCard.tsx', 'Jadwal dari coach'],
  ['Ubah tanggal Dilatih (set ikut pindah) / Tandai belum dilatih', 'src/app/api/coach/pt/[packageId]/sessions/[number]/route.ts', 'export async function PATCH'],
  ['Selebrasi PR penuh 1 layar, timer tetap jalan di pojok', 'src/components/shared/PRCelebration.tsx', 'Timer tetap jalan'],
  ['Slide program penuh di samping timer', 'src/components/shared/SlideShow.tsx', '<ProgramSlide fill'],
  ['Latihan terkunci sampai booking kelas hari itu', 'src/app/member/dashboard/page.tsx', 'BookingRequired'],
  ['Simpan set ditolak tanpa booking kelas', 'src/app/api/member/sets/route.ts', 'trainingGate'],
  ['Set tanpa tanda /sisi mengikuti program coach', 'src/app/api/member/sets/route.ts', 'resolvePerSide'],
  ['Set tanpa tanda /sisi mengikuti program coach (coach)', 'src/app/api/coach/members/[memberId]/sets/route.ts', 'resolvePerSide'],
  ['Kuota dinaikkan: daftar tunggu ikut naik', 'src/app/api/bookings/settings/route.ts', 'setQuota'],
  ['Daftar tunggu tidak naik ke kelas yang sudah selesai', 'src/lib/booking.ts', 'now >= classEnd(day, session)'],
  ['Tanda uji coba di Booking', 'src/app/member/booking/page.tsx', 'TrialNotice'],
  ['Tanda uji coba di Beli paket', 'src/app/member/paket/page.tsx', 'TrialNotice'],
  ['Booking hari ini tidak bisa dibatalkan setelah mencatat latihan', 'src/lib/booking.ts', 'Kamu sudah mencatat latihan hari ini'],
  ['Bukti transfer tetap terkirim kalau Drive gagal', 'src/app/api/member/membership-orders/[orderId]/route.ts', 'keeping it on the order'],
  ['Bukti transfer aplikasi tetap ada setelah disetujui', 'src/app/api/payments/[paymentId]/proof/route.ts', 'proofImageData'],
  ['Hapus pembayaran ikut menarik paket yang belum dipakai', 'src/app/api/payments/[paymentId]/route.ts', 'membership.delete'],
  ['Saklar buka/tahan booking member', 'src/lib/trainingGate.ts', 'BOOKING_OPEN'],
  ['Saklar buka/tahan booking member (API)', 'src/app/api/bookings/route.ts', 'BOOKING_OPEN'],
  ['Impor FitQuarter: member dengan email sama tidak bikin gagal', 'src/lib/membership.ts', 'Members sharing an'],
  ['Notifikasi disimpan 6 bulan', 'src/app/api/cron/program-today/route.ts', 'KEEP_DAYS = 183'],
  ['Pembelian yang dibatalkan otomatis diberi tahu ke member', 'src/app/member/paket/page.tsx', 'AUTO_CLOSED'],
  ['Ekspor data ke Excel (owner & admin)', 'src/lib/dataExport.ts', 'buildExport'],
  ['Menu Ekspor data', 'src/app/leads/layout.tsx', '/leads/ekspor'],
  ['Kartu paket: paket yang belum mulai ditandai Mulai …', 'src/components/member/MembershipList.tsx', 'chipMembership'],
  ['Bayar paket lewat Virtual Account Midtrans', 'src/components/member/PackageShop.tsx', 'VaStep'],
  ['Webhook Midtrans diverifikasi tanda tangan', 'src/app/api/midtrans/notification/route.ts', 'signatureOk'],
  ['VA lunas → paket aktif otomatis', 'src/lib/orders.ts', 'settleVa'],
  ['Bayar paket lewat QRIS Midtrans', 'src/components/member/PackageShop.tsx', 'Tampilkan kode QRIS'],
];
for (const [name, file, marker] of FEATURES) {
  const path = join(root, file);
  if (!existsSync(path)) failures.push(`${name}: file hilang (${file})`);
  else if (marker && !readFileSync(path, 'utf8').includes(marker)) failures.push(`${name}: "${marker}" tidak ada lagi di ${file}`);
}

async function load(entry) {
  const built = await build({ entryPoints: [entry], absWorkingDir: root, bundle: true, platform: 'node', format: 'esm', write: false });
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
}
function check(name, fn) {
  try { fn(); } catch (e) { failures.push(`${name}: ${e.message}`); }
}

const { isBarbellExercise } = await load('src/lib/barbell.ts');
check('Deteksi gerakan barbell', () => {
  for (const [n, eq] of [['BB Hip Thrust'], ['Barbell Row'], ['Back Squat', 'Barbell'], ['Deadlift'], ['Power Clean']]) assert.equal(isBarbellExercise(n, eq), true, n);
  for (const [n, eq] of [['DB Bench Press'], ['Goblet Squat'], ['KB Deadlift'], ['Deadlift', 'Dumbbell'], ['Burpee']]) assert.equal(isBarbellExercise(n, eq), false, n);
});

const { weekNumberForDate, nextProgramDay, PROGRAM_DAYS } = await load('src/lib/programRotation.ts');
check('Rotasi minggu mengikuti jumlah minggu coach', () => {
  const anchor = new Date(2026, 9, 5); // a Monday, Minggu 1
  assert.equal(weekNumberForDate(new Date(2026, 9, 26), anchor, 1), 4);
  assert.equal(weekNumberForDate(new Date(2026, 10, 2), anchor, 1), 1);
  assert.equal(weekNumberForDate(new Date(2026, 10, 2), anchor, 1, 6), 5);
  assert.equal(weekNumberForDate(new Date(2026, 10, 16), anchor, 1, 6), 1);
});
check('Hari program SENIN–SABTU, + Tambah hari lanjut', () => {
  assert.deepEqual(PROGRAM_DAYS, ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']);
  assert.equal(nextProgramDay([]), 'SENIN');
  assert.equal(nextProgramDay(['SENIN', 'RABU']), 'KAMIS');
  assert.equal(nextProgramDay(['SABTU']), 'SENIN');
});

const { sessionFor } = await load('src/lib/ptSession.ts');
check('Sesi PT tidak loncat', () => {
  const day = (d) => new Date(Date.UTC(2026, 10, d));
  const s = (number, heldOn, slots = 1) => ({ number, heldOn, slots: Array(slots).fill(0) });
  assert.equal(sessionFor([s(1, day(2)), s(2, null)], day(3)).number, 2);
  assert.equal(sessionFor([s(1, day(2)), s(2, day(3)), s(3, null)], day(3)).number, 2);
  assert.equal(sessionFor([s(1, day(2))], day(3)), null);
});

const { musclesFor } = await load('src/lib/muscles.ts');
check('Kamus otot mengenali ejaan Activa', () => {
  assert.equal(musclesFor('DB Curl', 'Bisep').biceps, 1);
  assert.equal(musclesFor('Dips', 'Trisep').triceps, 1);
  assert.equal(musclesFor('Bench Press', 'Dada', 'Trisep, Bahu').triceps, 0.5);
  assert.ok(Object.keys(musclesFor('Thruster', 'Full Body')).length >= 4);
});
const { muscleSetsByRound } = await load('src/lib/muscles.ts');
check('Set per otot bulat, superset dihitung sekali per ronde', () => {
  const bench = { exercise: 'DB Bench Press', muscles: musclesFor('DB Bench Press', 'Dada', 'Trisep'), sets: 3 };
  const pushdown = { exercise: 'Triceps Pushdown', muscles: musclesFor('Triceps Pushdown', 'Trisep'), sets: 3 };
  assert.deepEqual(muscleSetsByRound([bench, pushdown], [['DB Bench Press', 'Triceps Pushdown']]), { chest: 3, triceps: 3 });
  assert.deepEqual(muscleSetsByRound([bench, pushdown]), { chest: 3, triceps: 6 });
});

const { isClosedDay, scheduleLabel } = await load('src/lib/ptSession.ts');
check('Jadwal PT: tidak bisa hari Minggu, label tanggal', () => {
  assert.equal(isClosedDay('2026-11-08'), true);
  assert.equal(isClosedDay('2026-11-09'), false);
  assert.equal(scheduleLabel('2026-11-09', '07:00'), 'Senin, 9 Nov · 07:00');
});

const { unitForMovement } = await load('src/lib/setUnits.ts');
check('Gerakan tahan (plank, wall sit) dicatat dalam detik', () => {
  for (const [n, t] of [['Plank', '45'], ['Banded Wall Sit', '45'], ['Dead Hang', '30'], ['Side Plank', '']]) assert.equal(unitForMovement(n, t), 'SECONDS', n);
  for (const [n, t] of [['Plank Jacks', '20'], ['Hollow Rock', '15'], ['Hang Clean', '5'], ['Wall Sit', '10 reps'], ['Back Squat', '8']]) assert.equal(unitForMovement(n, t), 'REPS', n);
});

const { repDefaultOf } = await load('src/lib/setUnits.ts');
check('Target "12 each" terbaca 12 reps tiap sisi', () => {
  for (const [t, n] of [['12', 12], ['10 reps each', 10], ['12 each', 12], ['8-10', 8], ['10/sisi', 10], ['12 per side', 12]]) assert.equal(repDefaultOf(t), n, t);
  for (const t of ['30"', '1 lap', '200 m']) assert.equal(repDefaultOf(t), null, t);
});

const { focusTitle } = await load('src/lib/muscles.ts');
check('Judul Fokus otot mengikuti bagian badan terbanyak', () => {
  assert.equal(focusTitle({ quads: 6, glutes: 4, abs: 2 }), 'Hari kaki');
  assert.equal(focusTitle({ chest: 6, triceps: 3, quads: 2 }), 'Hari tubuh atas');
  assert.equal(focusTitle({ abs: 5, obliques: 3, chest: 2 }), 'Hari perut & inti');
  assert.equal(focusTitle({ chest: 4, quads: 4, abs: 2 }), 'Seluruh tubuh');
  assert.equal(focusTitle({}), 'Seluruh tubuh');
});

const story = await load('src/lib/photoStory.ts');
check('Story foto: kolase 1–4 foto dan foto selalu menutupi kotak', () => {
  for (const n of [1, 2, 3, 4]) assert.equal(story.layoutBoxes(n).length, n);
  const [big, a, b] = story.layoutBoxes(3);
  assert.equal(big.h, Math.round(1920 * 0.58));
  assert.equal(a.y, big.h + 8);
  assert.equal(b.x - (a.x + a.w), 8);
  const img = { width: 4000, height: 3000 };
  const box = story.layoutBoxes(1)[0];
  const p = story.clampPlacement(img, box, { zoom: 9, dx: 99999, dy: -99999 });
  assert.equal(p.zoom, 4);
  const r = story.imageRect(img, box, p);
  assert.ok(r.x <= box.x + 0.01 && r.y <= box.y + 0.01 && r.x + r.w >= box.x + box.w - 0.01 && r.y + r.h >= box.y + box.h - 0.01);
  assert.equal(story.clampPlacement(img, box, { zoom: 0.2, dx: 0, dy: 0 }).zoom, 1);
});

const { firstPerExercise } = await load('src/lib/records.ts');
check('Kartu Rekor baru memakai set rekor terberat per gerakan', () => {
  const sets = [{ exerciseId: 'squat', weight: 151 }, { exerciseId: 'dl', weight: 180 }, { exerciseId: 'squat', weight: 140 }, { exerciseId: 'dl', weight: 170 }];
  assert.deepEqual(firstPerExercise(sets).map((s) => s.weight), [151, 180]);
});

const { parseBirthDate } = await load('src/lib/birthDate.ts');
check('Tanggal lahir: tanggal tidak ada, masa depan, dan umur di luar 5–100 ditolak', () => {
  assert.ok('date' in parseBirthDate('1995-05-12', '2026-11-17'));
  assert.equal(parseBirthDate('1995-05-12', '2026-11-17').date.toISOString(), '1995-05-12T00:00:00.000Z');
  for (const v of ['1995-02-30', '2027-01-01', '2024-01-01', '1900-01-01', '12-05-1995', '']) assert.ok('error' in parseBirthDate(v, '2026-11-17'), v);
  assert.ok('date' in parseBirthDate('2021-11-17', '2026-11-17'));
  assert.ok('error' in parseBirthDate('2021-11-18', '2026-11-17'));
});

const fq = await load('src/lib/fitquarter.ts');
check('FitQuarter: jenis paket, kuota, dan membership yang sudah berakhir', () => {
  assert.equal(fq.membershipKind('Bootcamp Class Visit: 10x Bootcamp'), 'BOOTCAMP_VISIT');
  assert.equal(fq.membershipKind('Bootcamp Class: 1 Bulan Unlimited'), 'BOOTCAMP_UNLIMITED');
  assert.equal(fq.membershipKind('Paket no Expiry: 8x no Expiry'), 'NO_EXPIRY');
  assert.equal(fq.membershipKind('Private Couple | Ari: PTC 8x'), 'PT');
  assert.equal(fq.membershipKind('Trial PT Cindy: 2x Trial PT'), 'PT');
  assert.equal(fq.membershipKind('Mandiri: 1Bulan'), 'MANDIRI');
  assert.deepEqual(fq.parseCsv('a,"b, c","d ""e"""\r\n1,2,3\n'), [['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
  const head = 'Member ID,Name,Email,Phone,Status,Date of Birth,ID Number,Joined Date,Sales Representative,Transaction ID,Membership,Membership Status,Start Date,End Date,Quota Used,Quota Left';
  const csv = [head,
    'M1,A,A@X.test,1,Active,1990-01-02,,2025-01-01,,T1,Paket no Expiry: 8x no Expiry,Active,2026-10-01,2028-10-01,3,5',
    'M1,A,A@X.test,1,Active,1990-01-02,,2025-01-01,,T0,Bootcamp Class: 1 Bulan Unlimited,Inactive,2026-08-01,2026-08-31,Unlimited,Unlimited',
    'M2,B,b@x.test,2,Active,N/A,,2025-01-01,,T2,Private Training | Ari: PT 8x,Active,2026-11-01,2027-01-01,2,-4',
    'M3,C,c@x.test,3,Inactive,N/A,,2025-01-01,,N/A,N/A,N/A,N/A,N/A,N/A,N/A'].join('\n');
  const r = fq.readMemberList(csv, '2026-11-17');
  assert.equal(r.members.length, 3);
  assert.equal(r.members[0].email, 'a@x.test');
  assert.equal(r.members[0].birthDate.toISOString(), '1990-01-02T00:00:00.000Z');
  assert.deepEqual(r.memberships.map((m) => [m.sourceRef, m.credits, m.creditsUsed, m.canBook]), [['T1', 8, 3, true], ['T2', 2, 2, false]]);
  assert.deepEqual(r.skipped, { noPackage: 1, ended: 1, badDates: 0 });
  assert.ok('error' in fq.readMemberList('nama,email\nx,y', '2026-11-17'));
});

const br = await load('src/lib/bookingRules.ts');
check('Booking: jam kelas WIB, batal 2 jam sebelum, tanpa Minggu, kredit yang habis duluan dipakai dulu', () => {
  const s4 = br.sessionById('class-4');
  assert.equal(br.classStart('2026-11-18', s4).toISOString(), '2026-11-18T09:00:00.000Z');
  const start = br.classStart('2026-11-18', s4);
  assert.ok(br.canCancelAt(new Date('2026-11-18T07:00:00Z'), start, 2));
  assert.ok(!br.canCancelAt(new Date('2026-11-18T07:00:01Z'), start, 2));
  assert.deepEqual(br.bookableDays('2026-11-17', 7), ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-23']);
  const ms = [
    { id: 'late', canBook: true, credits: 8, creditsUsed: 2, startsAt: '2026-10-01', expiresAt: '2028-10-01' },
    { id: 'soon', canBook: true, credits: null, creditsUsed: 0, startsAt: '2026-11-01', expiresAt: '2026-12-01' },
    { id: 'empty', canBook: true, credits: 4, creditsUsed: 4, startsAt: '2026-11-01', expiresAt: '2026-11-20' },
    { id: 'pt', canBook: false, credits: 8, creditsUsed: 0, startsAt: '2026-11-01', expiresAt: '2026-11-19' },
  ];
  assert.equal(br.pickMembership(ms, '2026-11-18').id, 'soon');
  assert.equal(br.pickMembership(ms, '2026-12-05').id, 'late');
  assert.equal(br.pickMembership(ms.slice(2), '2026-11-18'), null);
  // Unlimited: 1 class a day; a second class that day falls back to a sessions package.
  assert.equal(br.pickMembership(ms, '2026-11-18', { unlimitedUsedToday: true }).id, 'late');
  assert.equal(br.pickMembership([ms[1]], '2026-11-18', { unlimitedUsedToday: true }), null);
  assert.ok(br.MEMBER_CODE.test('OLY-004512') && !br.MEMBER_CODE.test('8991234567890'));
});

check('Latihan perlu booking kelas, kecuali PT, Mandiri, hari tanpa kelas, atau sudah mulai mencatat', () => {
  const base = { day: '2026-11-18', booked: false, ptClient: false, ownTraining: false, classesThatDay: true, loggedThatDay: false };
  assert.equal(br.needsBooking(base), true);
  assert.equal(br.needsBooking({ ...base, booked: true }), false);
  assert.equal(br.needsBooking({ ...base, ptClient: true }), false);
  assert.equal(br.needsBooking({ ...base, ownTraining: true }), false);
  assert.equal(br.needsBooking({ ...base, classesThatDay: false }), false);
  assert.equal(br.needsBooking({ ...base, loggedThatDay: true }), false);
  assert.equal(br.needsBooking({ ...base, day: '2026-11-17' }), false);
});

const wa = await load('src/lib/whatsapp.ts');
check('Nomor WhatsApp: format umum diterima, email dan angka tunggal ditolak', () => {
  for (const ok of ['081234567890', '0812-3456-7890', '+62 812 3456 7890', '(0812) 3456.7890', '6281234567890']) assert.ok(wa.looksLikeWaNumber(ok), ok);
  for (const bad of ['', '0', 'N/A', 'nama@gmail.com', '12345', '0812345678901234567']) assert.ok(!wa.looksLikeWaNumber(bad), bad);
});

const ex = await load('src/lib/exportRules.ts');
check('Ekspor data: pilihan bagian & periode divalidasi, jam Jakarta', () => {
  assert.deepEqual(ex.parseExportRequest('lead,member,x', '2026-11-01', '2026-11-19'), { sections: ['member', 'lead'], from: '2026-11-01', to: '2026-11-19' });
  assert.ok('error' in ex.parseExportRequest('', '2026-11-01', '2026-11-19'));
  assert.ok('error' in ex.parseExportRequest('member', '2026-11-19', '2026-11-01'));
  assert.ok('error' in ex.parseExportRequest('member', '2025-01-01', '2026-11-19'));
  assert.ok('error' in ex.parseExportRequest('member', '2026-02-30x', '2026-11-19'));
  assert.equal(ex.periodBounds('2026-11-19', '2026-11-19').start.toISOString(), '2026-11-18T17:00:00.000Z');
  assert.equal(ex.jakartaStamp(new Date('2026-11-18T17:30:00Z')), '2026-11-19 00:30');
});

const mt = await load('src/lib/midtransRules.ts');
check('Midtrans VA: nomor VA dibaca, tanda tangan dicek, status lunas/kedaluwarsa', () => {
  const bca = mt.parseCharge({ status_code: '201', va_numbers: [{ bank: 'bca', va_number: '12345678901' }], expiry_time: '2026-11-20 16:00:00' });
  assert.equal(bca.vaNumber, '12345678901');
  assert.equal(bca.expiresAt.toISOString(), '2026-11-20T09:00:00.000Z');
  const mandiri = mt.parseCharge({ status_code: '201', bill_key: '990011', biller_code: '70012' });
  assert.deepEqual([mandiri.vaNumber, mandiri.billerCode], ['990011', '70012']);
  assert.equal(mt.parseCharge({ status_code: '400', status_message: 'bad' }), null);
  const n = { order_id: 'ord-1', status_code: '200', gross_amount: '349000.00' };
  
  const sig = createHash('sha512').update('ord-1200349000.00SB-key').digest('hex');
  assert.ok(mt.signatureOk({ ...n, signature_key: sig }, 'SB-key'));
  assert.ok(!mt.signatureOk({ ...n, signature_key: sig }, 'other-key'));
  assert.ok(!mt.signatureOk({ ...n, signature_key: sig }, ''));
  assert.equal(mt.vaOutcome({ transaction_status: 'settlement', gross_amount: '349000.00' }, 349000), 'paid');
  assert.equal(mt.vaOutcome({ transaction_status: 'settlement', gross_amount: '1000.00' }, 349000), 'mismatch');
  assert.equal(mt.vaOutcome({ transaction_status: 'pending', gross_amount: '349000.00' }, 349000), 'pending');
  assert.equal(mt.vaOutcome({ transaction_status: 'expire' }, 349000), 'dead');
  const body = mt.chargeBody({ gatewayOrderId: 'g1', amount: 349000, bank: 'mandiri', item: { id: 'p', name: 'Paket' }, customer: { name: 'A', email: 'a@x.id' } });
  assert.equal(body.payment_type, 'echannel');
  assert.equal(mt.chargeBody({ gatewayOrderId: 'g1', amount: 1, bank: 'bni', item: { id: 'p', name: 'P' }, customer: { name: 'A', email: 'a@x.id' } }).bank_transfer.bank, 'bni');
  const q = mt.chargeBody({ gatewayOrderId: 'g2', amount: 349000, bank: 'qris', item: { id: 'p', name: 'P' }, customer: { name: 'A', email: 'a@x.id' } });
  assert.deepEqual([q.payment_type, q.custom_expiry.unit], ['qris', 'minute']);
  assert.equal(mt.parseCharge({ status_code: '201', qr_string: '00020101021226...', expiry_time: '2026-11-20 16:30:00' }).vaNumber, '00020101021226...');
});

const pr = await load('src/lib/packageRules.ts');
check('Paket: masa berlaku bulan/minggu/tidak hangus, Unlimited baru menunggu yang lama habis', () => {
  assert.equal(pr.packageEnd({ durationMonths: 1, durationDays: 30 }, '2026-11-17'), '2026-12-17');
  assert.equal(pr.packageEnd({ durationMonths: 1, durationDays: 30 }, '2027-01-31'), '2027-02-28');
  assert.equal(pr.packageEnd({ durationMonths: null, durationDays: 28 }, '2026-11-17'), '2026-12-15');
  assert.equal(pr.packageEnd({ durationMonths: null, durationDays: null }, '2026-11-17'), '2099-12-31');
  assert.equal(pr.packageStart('BOOTCAMP_UNLIMITED', '2026-11-17', '2026-11-30'), '2026-12-01');
  assert.equal(pr.packageStart('BOOTCAMP_UNLIMITED', '2026-11-17', null), '2026-11-17');
  assert.equal(pr.packageStart('NO_EXPIRY', '2026-11-17', '2026-11-30'), '2026-11-17');
  assert.equal(pr.packageDetail({ credits: 8, durationDays: 28, durationMonths: null }), '8 sesi · berlaku 4 minggu');
  assert.equal(pr.packageDetail({ credits: 4, durationDays: null, durationMonths: null }), '4 sesi · tidak hangus');
});

const { formatRepTarget } = await load('src/lib/programSlide.ts');
check('Slide menulis gerakan tahan dalam detik', () => {
  assert.equal(formatRepTarget('45', 'Plank'), '45"');
  assert.equal(formatRepTarget('8', 'Back Squat'), '8 reps');
  assert.equal(formatRepTarget('10 reps each', 'Lunge'), '10 reps each');
});

if (failures.length) {
  console.error(`Penjaga fitur: ${failures.length} fitur live hilang atau berubah:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Penjaga fitur: ${routes.length} halaman/API dan ${FEATURES.length} fitur masih ada ✓`);
