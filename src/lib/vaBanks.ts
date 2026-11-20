// Banks members can pay a Midtrans virtual account from. Client-safe (no
// secrets, no Node APIs): the payment screen imports it.

export const VA_BANKS = ["bni", "bri", "mandiri", "permata", "bca"] as const;
export type VaBank = (typeof VA_BANKS)[number];

export const VA_BANK_LABEL: Record<VaBank, string> = {
  bca: "BCA",
  bni: "BNI",
  bri: "BRI",
  mandiri: "Mandiri",
  permata: "Permata",
};

/**
 * Virtual accounts are off unless MIDTRANS_VA_BANKS lists banks: the owner
 * takes QRIS only for now. Midtrans' Starter Pack has
 * "bni,bri,mandiri,permata"; a BCA VA needs its own activation.
 */
export const STARTER_PACK_VA_BANKS: VaBank[] = ["bni", "bri", "mandiri", "permata"];

/** "bni,permata,bca" → the known banks in it, in VA_BANKS order; empty → none (VA off). */
export function parseVaBanks(v: string | null | undefined): VaBank[] {
  const picked = (v ?? "").toLowerCase().split(/[\s,]+/);
  return VA_BANKS.filter((b) => picked.includes(b));
}

export const isVaBank = (v: unknown): v is VaBank => typeof v === "string" && (VA_BANKS as readonly string[]).includes(v);

/** Short "how to pay" lines per bank, shown under the number. */
export const VA_HOW_TO: Record<VaBank, string[]> = {
  bca: ["Buka BCA mobile / KlikBCA → m-Transfer → BCA Virtual Account.", "Masukkan nomor VA di atas, cek nama & nominal, lalu bayar."],
  bni: ["Buka BNI Mobile Banking → Transfer → Virtual Account Billing.", "Masukkan nomor VA di atas, cek nama & nominal, lalu bayar."],
  bri: ["Buka BRImo → Pembayaran → BRIVA.", "Masukkan nomor VA di atas, cek nama & nominal, lalu bayar."],
  mandiri: ["Buka Livin' by Mandiri → Bayar → cari Midtrans (atau masukkan kode biller di atas).", "Masukkan kode bayar di atas, cek nama & nominal, lalu bayar."],
  permata: ["Buka PermataMobile X → Bayar Tagihan → Virtual Account.", "Dari bank lain (mis. BCA): transfer antarbank ke Permata dengan nomor VA di atas sebagai nomor rekening tujuan."],
};

/** How a Midtrans payment is made: a bank's virtual account, or a QRIS code. */
export type GatewayMethod = VaBank | "qris";
export const isGatewayMethod = (v: unknown): v is GatewayMethod => v === "qris" || isVaBank(v);
export const GATEWAY_LABEL: Record<GatewayMethod, string> = { ...VA_BANK_LABEL, qris: "QRIS" };

/** QRIS codes expire quickly; a VA number lasts a day. */
export const QRIS_MINUTES = 30;
export const QRIS_HOW_TO = [
  "Buka GoPay, OVO, DANA, ShopeePay, LinkAja, atau m-banking yang bisa bayar QRIS.",
  "Scan kode QR di atas. Kalau scan dari HP ini, ketuk Simpan gambar QR lalu pilih scan dari galeri.",
  "Cek nama Olympus & nominal, lalu bayar.",
];
