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
  ['Selebrasi PR: karakter + papan PR', 'src/components/shared/PRCelebration.tsx', 'prc-body'],
  ['Selebrasi PR: tombol suara 🔊/🔇', 'src/components/shared/SlideShow.tsx', 'togglePrSound'],
  ['Hapus set tetap jalan saat pindah halaman', 'src/components/ui/UndoDeleteButton.tsx', 'pagehide'],
  ['Hapus set langsung di layar latihan hari ini', 'src/components/member/TodayWorkoutPlan.tsx', 'removeSet'],
  ['Tap ✓ cepat beruntun tersimpan semua (antrean)', 'src/components/member/TodayWorkoutPlan.tsx', 'sendQueue'],
  ['Set offline disimpan di HP sampai ada sinyal', 'src/components/member/TodayWorkoutPlan.tsx', 'addPending'],
  ['Jumlah baris = jumlah set di slide', 'src/lib/todayPlan.ts', 'schemeUsesSets'],
  ['Gerakan tanpa beban / TABATA tidak perlu dicatat', 'src/lib/todayPlan.ts', 'noInput'],
  ['Rotasi program aman saat dibuat bersamaan', 'src/lib/programHistory.ts', 'skipDuplicates'],
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
  ['Feed menghitung otot dari set terbaru per ronde', 'src/lib/feed.ts', 'programRounds'],
  ['Volume & PR di feed dari set terbaru', 'src/lib/feed.ts', 'totalVolume: s.totalVolume'],
  ['Jadwal sesi PT dari coach, terlihat oleh klien', 'src/components/member/PtClientCard.tsx', 'Jadwal dari coach'],
  ['Ubah tanggal Dilatih (set ikut pindah) / Tandai belum dilatih', 'src/app/api/coach/pt/[packageId]/sessions/[number]/route.ts', 'export async function PATCH'],
  ['Selebrasi PR penuh 1 layar, timer tetap jalan di pojok', 'src/components/shared/PRCelebration.tsx', 'Timer tetap jalan'],
  ['Slide program penuh di samping timer', 'src/components/shared/SlideShow.tsx', '<ProgramSlide fill'],
  ['Beli member di aplikasi (transfer/QRIS + bukti)', 'src/components/member/MembershipShop.tsx', 'membership-orders'],
  ['Konfirmasi pembelian member → Payment + pengingat', 'src/lib/membership.ts', 'scheduleRenewalReminder'],
  ['Aktifkan member yang bayar di meja depan', 'src/app/leads/member-app/page.tsx', 'AddMembershipForm'],
  ['Paket unlimited / kredit, jual di aplikasi', 'src/components/leads/PackageListManager.tsx', 'Jual di aplikasi member'],
  ['Kartu status member di dashboard', 'src/app/member/dashboard/page.tsx', 'MembershipCard'],
  ['Kode unik di nominal pembelian member', 'src/lib/membership.ts', 'pickUniqueCode'],
  ['Admin centang "uang sudah masuk" sebelum konfirmasi', 'src/lib/validation.ts', 'verified: z.literal(true'],
  ['Calon member: Daftar & beli paket dari halaman login', 'src/app/login/page.tsx', '/register?beli=1'],
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
