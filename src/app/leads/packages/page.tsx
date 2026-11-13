import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PackageListManager } from "@/components/leads/PackageListManager";
import { PaymentInfoForm } from "@/components/leads/PaymentInfoForm";
import { Card } from "@/components/ui/Card";

export default async function PackagesPage() {
  await requireRole("OWNER");

  const [packages, info] = await Promise.all([
    prisma.package.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }] }),
    prisma.gymPaymentInfo.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Daftar Harga</h1>
        <p className="text-sm text-muted">
          Kelola paket yang tersedia saat admin mencatat pembayaran. Paket nonaktif tidak muncul di form pembayaran,
          tapi struk lama tetap tidak berubah.
        </p>
      </div>
      <PackageListManager packages={packages} />
      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Info pembayaran di aplikasi member</h2>
          <p className="text-sm text-muted">
            Paket yang dicentang &quot;Jual di aplikasi member&quot; bisa dibeli member sendiri. Mereka transfer / scan QRIS ini, upload bukti, lalu admin
            konfirmasi di menu Member App.
          </p>
        </div>
        <PaymentInfoForm
          initial={{ bankName: info?.bankName ?? "", accountNumber: info?.accountNumber ?? "", accountName: info?.accountName ?? "", qrisImage: info?.qrisImage ?? null }}
        />
      </Card>
    </div>
  );
}
