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

// Groups consecutive slots into rounds. Scheme/sets come from the round's
// first slot only — that's the one slot the editor shows those inputs on.
export function groupSlotsIntoRounds<T extends SlotLike>(slots: T[]): { scheme: string; sets: string; slots: T[] }[] {
  const groups: { scheme: string; sets: string; slots: T[] }[] = [];
  let currentKey: string | null = null;
  for (const slot of slots) {
    const key = slotRoundKey(slot.slotLabel);
    if (key !== currentKey || groups.length === 0) {
      groups.push({ scheme: slot.roundScheme, sets: slot.sets, slots: [] });
      currentKey = key;
    }
    groups[groups.length - 1].slots.push(slot);
  }
  return groups;
}
