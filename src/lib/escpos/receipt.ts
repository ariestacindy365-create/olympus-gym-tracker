import { EscPosBuilder } from "./builder";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";

export interface OlympusReceiptData {
  receiptNumber: string;
  paidAt: string; // ISO string
  leadName: string;
  leadWaNumber: string;
  packageName: string;
  amount: number;
  paymentMethod: string;
  expiresAt: string | null; // ISO string
  note: string | null;
  createdByName: string;
}

function formatDateId(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

// Mirrors src/app/leads/[leadId]/receipt/[paymentId]/page.tsx's HTML
// receipt, adapted to ESC/POS commands for direct thermal printing (see
// src/lib/thermal-printer.ts).
export function buildOlympusReceipt(data: OlympusReceiptData): Uint8Array {
  const b = new EscPosBuilder();
  b.init();

  b.align("center");
  b.bold(true).line("OLYMPUS LIFTING CLUB").bold(false);
  b.line("STRUK PEMBAYARAN");

  b.align("left");
  b.divider();
  b.row("No. Struk", data.receiptNumber);
  b.row("Tanggal", formatDateId(data.paidAt));

  b.divider();
  b.line("Diterima Dari");
  b.bold(true).line(data.leadName).bold(false);
  b.line(data.leadWaNumber);

  b.divider();
  b.row("Paket", data.packageName);
  b.row("Nominal", formatRupiah(data.amount));
  b.row("Metode Bayar", PAYMENT_METHOD_LABEL[data.paymentMethod] ?? data.paymentMethod);
  if (data.expiresAt) {
    b.row("Berlaku Sampai", formatDateId(data.expiresAt));
  }

  b.divider();
  b.bold(true);
  b.row("TOTAL", formatRupiah(data.amount));
  b.bold(false);

  if (data.note) {
    b.divider();
    b.paragraph(`Catatan: ${data.note}`);
  }

  b.divider();
  b.align("center");
  b.line(`Diproses oleh ${data.createdByName}`);
  b.paragraph("Terima kasih telah bergabung bersama Olympus!");

  b.cut();
  return b.build();
}
