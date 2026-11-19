// Indonesian numbers are captured with a leading 0 (mis. "081234567890"),
// but wa.me links (and duplicate-detection) need the country code instead
// (628123...), digits only.
export function normalizeWaNumber(waNumber: string): string {
  const digits = waNumber.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : `62${digits}`;
}

/** "0812-3456-7890", "+62 812 3456 7890", "(0812) 3456.7890": a phone number (9–15 digits) once spacing and punctuation are gone. */
export function looksLikeWaNumber(value: string | null | undefined): boolean {
  return /^\+?\d{9,15}$/.test((value ?? "").replace(/[\s\-.()]/g, ""));
}

export function toWhatsAppLink(waNumber: string, message?: string): string {
  const normalized = normalizeWaNumber(waNumber);
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${query}`;
}
