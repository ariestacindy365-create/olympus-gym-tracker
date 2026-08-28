import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PackageListManager } from "@/components/leads/PackageListManager";

export default async function PackagesPage() {
  await requireRole("OWNER");

  const packages = await prisma.package.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }] });

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
    </div>
  );
}
