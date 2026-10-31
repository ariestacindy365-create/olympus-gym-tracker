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

if (failures.length) {
  console.error(`Penjaga fitur: ${failures.length} fitur live hilang atau berubah:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Penjaga fitur: ${routes.length} halaman/API dan ${FEATURES.length} fitur masih ada ✓`);
