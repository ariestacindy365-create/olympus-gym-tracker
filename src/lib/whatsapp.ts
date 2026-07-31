// Indonesian numbers are captured with a leading 0 (mis. "081234567890"),
// but wa.me links (and duplicate-detection) need the country code instead
// (628123...), digits only.
export function normalizeWaNumber(waNumber: string): string {
  const digits = waNumber.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : `62${digits}`;
}

export function toWhatsAppLink(waNumber: string, message?: string): string {
  const normalized = normalizeWaNumber(waNumber);
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${query}`;
}
