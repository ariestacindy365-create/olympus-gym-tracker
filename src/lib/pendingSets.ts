// Durable when localStorage works; otherwise kept in memory with an explicit warning.
const KEY = "olympus-pending-sets";
export interface PendingSet {
  owner: string;
  date: string;
  exerciseId: string;
  setNumber: number;
  body: Record<string, unknown>;
}
let memory: PendingSet[] = [];
const removed = new Set<string>();
let storageError: string | null = null;
const identity = (p: Pick<PendingSet, "owner" | "date" | "exerciseId" | "setNumber">) => JSON.stringify([p.owner, p.date, p.exerciseId, p.setNumber]);
function readDisk(): PendingSet[] {
  const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  if (!Array.isArray(raw) || raw.some((p) => !p || typeof p.owner !== "string" || typeof p.date !== "string" || typeof p.exerciseId !== "string" || !Number.isInteger(p.setNumber) || typeof p.body !== "object" || !p.body)) throw new Error("Invalid queue");
  return raw;
}
function allPending(): PendingSet[] {
  let disk: PendingSet[] = [];
  try { disk = readDisk(); } catch { storageError = "Penyimpanan HP penuh, ditolak, atau tidak bisa dibaca. Set hanya ada di memori sementara. Jangan tutup halaman; kirim saat online atau unduh cadangan."; }
  const merged = new Map([...disk, ...memory].map((p) => [identity(p), p]));
  return [...merged.values()].filter((p) => !removed.has(identity(p)));
}
export function loadPending(owner: string, date: string) { return allPending().filter((p) => p.owner === owner && p.date === date); }
export function getPendingStorageError() { return storageError; }
function persist(all: PendingSet[]) {
  memory = all;
  try {
    // Do not silently overwrite an unreadable/corrupt queue.
    readDisk();
    localStorage.setItem(KEY, JSON.stringify(all));
    memory = []; removed.clear(); storageError = null;
    return { persisted: true, error: null };
  } catch {
    storageError = "Antrean belum tersimpan di HP. Set masih ada di memori halaman ini. Jangan tutup halaman sebelum terkirim, atau unduh cadangan.";
    return { persisted: false, error: storageError };
  }
}
export function addPending(p: PendingSet) {
  removed.delete(identity(p));
  return persist([...allPending().filter((item) => identity(item) !== identity(p)), p]);
}
export function removePending(p: Pick<PendingSet, "owner" | "date" | "exerciseId" | "setNumber">) {
  const all = allPending().filter((item) => identity(item) !== identity(p));
  removed.add(identity(p));
  const result = persist(all);
  if (!result.persisted && all.length === 0) {
    storageError = "Set sudah tersimpan di server, tetapi antrean HP belum dapat dibersihkan. Jangan kirim ulang cadangan lama.";
    return { persisted: false, error: storageError };
  }
  return result;
}
export function downloadPending(owner: string, date: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(loadPending(owner, date), null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = `olympus-set-${date}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
