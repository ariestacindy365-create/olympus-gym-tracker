// Indonesian numbers are captured with a leading 0 (mis. "081234567890"),
// but wa.me links need the country code instead (628123...).
export function toWhatsAppLink(waNumber: string, message?: string): string {
  const digits = waNumber.replace(/\D/g, "");
  const normalized = digits.startsWith("0")
    ? `62${digits.slice(1)}`
    : digits.startsWith("62")
      ? digits
      : `62${digits}`;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${query}`;
}
