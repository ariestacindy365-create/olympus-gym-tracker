import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OlympusLogo } from "@/components/ui/OlympusLogo";
import { PrintReceiptButton } from "@/components/leads/PrintReceiptButton";
import { formatRupiah, PAYMENT_METHOD_LABEL } from "@/lib/packages";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ leadId: string; paymentId: string }>;
}) {
  const { leadId, paymentId } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      lead: true,
      createdBy: { select: { name: true } },
    },
  });

  if (!payment || payment.leadId !== leadId) notFound();

  const receiptNumber = `OLY-${payment.id.slice(-8).toUpperCase()}`;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-4 print:max-w-none print:gap-2 print:py-0">
      <div className="rounded-lg border border-border bg-surface p-6 print:border-0 print:p-2">
        <div className="mb-6 flex flex-col items-center text-center print:mb-3">
          <OlympusLogo height={40} className="print:!h-8 print:!w-auto" />
          <h1 className="mt-3 font-display text-lg font-bold print:mt-2 print:text-base">STRUK PEMBAYARAN</h1>
          <p className="text-xs text-muted">Olympus Lifting Club</p>
        </div>

        <div className="mb-4 flex justify-between text-xs text-muted print:mb-2">
          <span>No. Struk: {receiptNumber}</span>
          <span>{payment.paidAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</span>
        </div>

        <div className="mb-4 border-t border-dashed border-border pt-4 print:mb-2 print:pt-2">
          <p className="text-xs uppercase tracking-wide text-muted">Diterima Dari</p>
          <p className="font-semibold">{payment.lead.name}</p>
          <p className="text-xs text-muted">{payment.lead.waNumber}</p>
        </div>

        <div className="mb-4 border-t border-dashed border-border pt-4 print:mb-2 print:pt-2">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-muted">Paket</td>
                <td className="py-1 text-right font-medium">{payment.packageName}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Nominal</td>
                <td className="py-1 text-right font-medium">{formatRupiah(payment.amount)}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Metode Bayar</td>
                <td className="py-1 text-right font-medium">
                  {PAYMENT_METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-4 flex items-center justify-between border-t border-border pt-3 print:mb-2 print:pt-2">
          <span className="font-display text-base font-semibold">TOTAL</span>
          <span className="font-display text-lg font-bold text-accent">{formatRupiah(payment.amount)}</span>
        </div>

        {payment.note && (
          <p className="mb-4 border-t border-dashed border-border pt-4 text-xs text-muted print:mb-2 print:pt-2">
            Catatan: {payment.note}
          </p>
        )}

        <div className="border-t border-dashed border-border pt-4 text-center text-xs text-muted print:pt-2">
          <p>Diproses oleh {payment.createdBy.name}</p>
          <p className="mt-2">Terima kasih telah bergabung bersama Olympus!</p>
        </div>
      </div>

      <PrintReceiptButton />
    </div>
  );
}
