import { EscPosBuilder } from "./builder";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";

export interface OlympusSaleReceiptData {
  receiptNumber: string;
  createdAt: string; // ISO string
  productName: string;
  price: number;
  paymentMethod: string;
  createdByName: string;
}

function formatDateId(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

// Same ESC/POS pattern as buildOlympusReceipt, for a single-item Kasir sale
// instead of a membership payment.
export function buildOlympusSaleReceipt(data: OlympusSaleReceiptData): Uint8Array {
  const b = new EscPosBuilder();
  b.init();

  b.align("center");
  b.bold(true).line("OLYMPUS LIFTING CLUB").bold(false);
  b.line("STRUK PENJUALAN");

  b.align("left");
  b.divider();
  b.row("No. Struk", data.receiptNumber);
  b.row("Tanggal", formatDateId(data.createdAt));

  b.divider();
  b.row("Produk", data.productName);
  b.row("Harga", formatRupiah(data.price));
  b.row("Metode Bayar", PAYMENT_METHOD_LABEL[data.paymentMethod] ?? data.paymentMethod);

  b.divider();
  b.bold(true);
  b.row("TOTAL", formatRupiah(data.price));
  b.bold(false);

  b.divider();
  b.align("center");
  b.line(`Diproses oleh ${data.createdByName}`);
  b.paragraph("Terima kasih!");

  b.cut();
  return b.build();
}
