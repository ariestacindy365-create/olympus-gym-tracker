// Pricing itself lives in the Package table now, managed at /leads/packages
// (see prisma/seed-packages.ts for the one-time migration from the old
// hardcoded list). This file just keeps small display helpers.
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  KARTU_KREDIT: "Kartu Kredit",
  DEBIT: "Debit",
  FITQUARTER: "Fitquarter",
};
