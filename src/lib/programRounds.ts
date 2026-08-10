export interface SlotLike {
  slotLabel: string;
  movementId: string;
  sets: string;
  repTarget: string;
  targetWeight: string;
  note: string;
  roundScheme: string;
}

// Slots sharing the same leading letter in slotLabel ("A1","A2") belong to
// one round; a bare label like "FINISHER" is its own round.
export function slotRoundKey(slotLabel: string): string {
  const trimmed = slotLabel.trim().toUpperCase();
  const match = trimmed.match(/^([A-Z]+)/);
  return match ? match[1] : trimmed || "_";
}

export interface RoundGroup {
  scheme: string;
  sets: string;
  slots: SlotLike[];
}

// One boolean per slot: true where a new round begins. A blank slotLabel
// (the continuation rows under something like "FINISHER") doesn't start a
// new round on its own — it stays part of whichever round came before it.
export function computeRoundStarts(slotLabels: string[]): boolean[] {
  const starts: boolean[] = [];
  let currentKey: string | null = null;
  slotLabels.forEach((label, i) => {
    const trimmed = label.trim();
    const key = trimmed ? slotRoundKey(trimmed) : currentKey;
    starts.push(i === 0 || key !== currentKey);
    currentKey = key;
  });
  return starts;
}

// Groups consecutive slots into rounds. Scheme/sets come from the round's
// first slot only — that's the one slot the editor shows those inputs on.
export function groupSlotsIntoRounds<T extends SlotLike>(slots: T[]): { scheme: string; sets: string; slots: T[] }[] {
  const starts = computeRoundStarts(slots.map((s) => s.slotLabel));
  const groups: { scheme: string; sets: string; slots: T[] }[] = [];
  slots.forEach((slot, i) => {
    if (starts[i]) {
      groups.push({ scheme: slot.roundScheme, sets: slot.sets, slots: [] });
    }
    groups[groups.length - 1].slots.push(slot);
  });
  return groups;
}
