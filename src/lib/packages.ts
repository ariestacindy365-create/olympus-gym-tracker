// Official 2026 price list from SalesScript_Olympus_2026_v1.pdf. Presets
// auto-fill the amount field on the payment form — admin can still edit it
// (promos, discounts) before saving.
export const PACKAGE_PRESETS: { name: string; price: number }[] = [
  { name: "Bootcamp 1 Bulan Unlimited", price: 699_000 },
  { name: "Bootcamp 2 Bulan Unlimited", price: 1_299_000 },
  { name: "Bootcamp 3 Bulan Unlimited", price: 1_799_000 },
  { name: "Bootcamp 4x Sesi", price: 349_000 },
  { name: "Bootcamp 8x Sesi", price: 599_000 },
  { name: "Private Training 8x Visit", price: 2_415_000 },
  { name: "Private Training 16x Visit", price: 4_686_000 },
  { name: "Private Training 24x Visit", price: 6_819_000 },
  { name: "Couple Training 8x Visit", price: 3_185_000 },
  { name: "Couple Training 16x Visit", price: 6_198_000 },
  { name: "Couple Training 24x Visit", price: 8_970_000 },
  { name: "Private Group Class 8x Sesi", price: 3_925_000 },
  { name: "Private Group Class 16x Sesi", price: 6_624_000 },
  { name: "Private Group Class 24x Sesi", price: 9_660_000 },
];

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
