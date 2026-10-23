// Client-only: sets the member ticked while the gym had no signal, kept in
// localStorage until they reach the server. The POST is an upsert on
// (exercise, day, set number), so sending one twice is harmless.

const KEY = "olympus-pending-sets";

export interface PendingSet {
  /** Whose phone queue this is (several members may share a tablet). */
  owner: string;
  date: string;
  exerciseId: string;
  setNumber: number;
  body: Record<string, unknown>;
}

export function loadPending(owner: string, date: string): PendingSet[] {
  try {
    const all: PendingSet[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return all.filter((p) => p.owner === owner && p.date === date);
  } catch {
    return [];
  }
}

function write(update: (all: PendingSet[]) => PendingSet[]) {
  try {
    const all: PendingSet[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    localStorage.setItem(KEY, JSON.stringify(update(all)));
  } catch {
    // Storage blocked: the set just stays queued in memory for this visit.
  }
}

const same = (a: PendingSet, b: Pick<PendingSet, "owner" | "date" | "exerciseId" | "setNumber">) =>
  a.owner === b.owner && a.date === b.date && a.exerciseId === b.exerciseId && a.setNumber === b.setNumber;

export function addPending(p: PendingSet) {
  write((all) => [...all.filter((x) => !same(x, p)), p]);
}

export function removePending(p: Pick<PendingSet, "owner" | "date" | "exerciseId" | "setNumber">) {
  write((all) => all.filter((x) => !same(x, p)));
}

/** The gym's day as "YYYY-MM-DD", so a set queued before midnight keeps its day. */
export function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
