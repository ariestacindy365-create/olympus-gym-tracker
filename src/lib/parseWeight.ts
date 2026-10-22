// Some phones (notably Indonesian keyboard layouts) type "," instead of "."
// for decimals, which Number("82,5") reads as NaN. Normalize before parsing.
export function parseWeightInput(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/** Weight lifted in a set: like parseWeightInput, but 0 is allowed (bodyweight / no load). */
export function parseLiftWeight(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : null;
}
