import { notFound } from "next/navigation";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OlympusLogo } from "@/components/ui/OlympusLogo";
import { PrintSaleReceiptButton } from "@/components/leads/PrintSaleReceiptButton";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";

export default async function SaleReceiptPage({ params }: { params: Promise<{ saleId: string }> }) {
  await requireAnyRole(["ADMIN", "OWNER"]);
  const { saleId } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { createdBy: { select: { name: true } } },
  });

  if (!sale) notFound();

  const receiptNumber = `OLY-${sale.id.slice(-8).toUpperCase()}`;
  const receiptData = {
    receiptNumber,
    createdAt: sale.createdAt.toISOString(),
    productName: sale.productName,
    price: sale.price,
    paymentMethod: sale.paymentMethod,
    createdByName: sale.createdBy.name,
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-4 print:max-w-none print:gap-2 print:py-0">
      {sale.deletedAt && (
        <div className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger print:hidden">
          Transaksi ini sudah dihapus pada {sale.deletedAt.toLocaleDateString("id-ID")}.
        </div>
      )}
      <div className="rounded-lg border border-border bg-surface p-6 print:border-0 print:p-2">
        <div className="mb-6 flex flex-col items-center text-center print:mb-3">
          <OlympusLogo height={40} className="print:!h-8 print:!w-auto" />
          <h1 className="mt-3 font-display text-lg font-bold print:mt-2 print:text-base">STRUK PENJUALAN</h1>
          <p className="text-xs text-muted">Olympus Lifting Club</p>
        </div>

        <div className="mb-4 flex justify-between text-xs text-muted print:mb-2">
          <span>No. Struk: {receiptNumber}</span>
          <span>{sale.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</span>
        </div>

        <div className="mb-4 border-t border-dashed border-border pt-4 print:mb-2 print:pt-2">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-muted">Produk</td>
                <td className="py-1 text-right font-medium">{sale.productName}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Harga</td>
                <td className="py-1 text-right font-medium">{formatRupiah(sale.price)}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Metode Bayar</td>
                <td className="py-1 text-right font-medium">
                  {PAYMENT_METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-4 flex items-center justify-between border-t border-border pt-3 print:mb-2 print:pt-2">
          <span className="font-display text-base font-semibold">TOTAL</span>
          <span className="font-display text-lg font-bold text-accent">{formatRupiah(sale.price)}</span>
        </div>

        <div className="border-t border-dashed border-border pt-4 text-center text-xs text-muted print:pt-2">
          <p>Diproses oleh {sale.createdBy.name}</p>
          <p className="mt-2">Terima kasih!</p>
        </div>
      </div>

      <PrintSaleReceiptButton receipt={receiptData} />
    </div>
  );
}
