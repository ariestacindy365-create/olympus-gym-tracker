// Banks members can pay a Midtrans virtual account from. Client-safe (no
// secrets, no Node APIs): the payment screen imports it.

export const VA_BANKS = ["bca", "bni", "bri", "mandiri"] as const;
export type VaBank = (typeof VA_BANKS)[number];

export const VA_BANK_LABEL: Record<VaBank, string> = {
  bca: "BCA",
  bni: "BNI",
  bri: "BRI",
  mandiri: "Mandiri",
};

export const isVaBank = (v: unknown): v is VaBank => typeof v === "string" && (VA_BANKS as readonly string[]).includes(v);

/** Short "how to pay" lines per bank, shown under the number. */
export const VA_HOW_TO: Record<VaBank, string[]> = {
  bca: ["Buka BCA mobile / KlikBCA → m-Transfer → BCA Virtual Account.", "Masukkan nomor VA di atas, cek nama & nominal, lalu bayar."],
  bni: ["Buka BNI Mobile Banking → Transfer → Virtual Account Billing.", "Masukkan nomor VA di atas, cek nama & nominal, lalu bayar."],
  bri: ["Buka BRImo → Pembayaran → BRIVA.", "Masukkan nomor VA di atas, cek nama & nominal, lalu bayar."],
  mandiri: ["Buka Livin' by Mandiri → Bayar → cari Midtrans (atau masukkan kode biller di atas).", "Masukkan kode bayar di atas, cek nama & nominal, lalu bayar."],
};
