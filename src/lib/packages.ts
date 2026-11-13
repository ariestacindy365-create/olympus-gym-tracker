// Pricing itself lives in the Package table now, managed at /leads/packages
// (see prisma/seed-packages.ts for the one-time migration from the old
// hardcoded list). This file just keeps small display helpers.
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/** "30 hari · 8 sesi kelas" / "30 hari · kelas unlimited". */
export function packageDetail(p: { durationDays: number | null; credits: number | null }): string {
  const kind = p.credits == null ? "kelas unlimited" : `${p.credits} sesi kelas`;
  return p.durationDays ? `${p.durationDays} hari · ${kind}` : kind;
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  KARTU_KREDIT: "Kartu Kredit",
  DEBIT: "Debit",
  FITQUARTER: "Fitquarter",
  TUNAI: "Tunai",
};

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  SEWA: "Sewa",
  GAJI: "Gaji",
  LISTRIK_AIR: "Listrik & Air",
  ALAT: "Alat/Perlengkapan",
  MARKETING: "Marketing",
  MAINTENANCE: "Maintenance",
  LAINNYA: "Lainnya",
};
