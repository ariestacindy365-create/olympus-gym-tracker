// Some phones (notably Indonesian keyboard layouts) type "," instead of "."
// for decimals, which Number("82,5") reads as NaN. Normalize before parsing.
export function parseWeightInput(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? num : null;
}
