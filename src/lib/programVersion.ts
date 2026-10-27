export class ProgramConflictError extends Error {
  constructor() { super("Program sudah diubah di perangkat lain. Draft kamu tetap tersimpan. Unduh draft lalu muat versi server untuk menggabungkan perubahan."); }
}
export function assertProgramVersion(current: Date | null, expected: string | null) {
  if ((current?.toISOString() ?? null) !== expected) throw new ProgramConflictError();
}
export function nextProgramDate(previous?: Date | null) {
  return new Date(Math.max(Date.now(), (previous?.getTime() ?? 0) + 1));
}
