import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { KasirScan } from "@/components/leads/KasirScan";

export default async function KasirPage() {
  await requireAnyRole(["ADMIN", "OWNER"]);

  const today = todayDateKey();
  const salesToday = await prisma.sale.findMany({
    where: { createdAt: { gte: today } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Kasir</h1>
        <p className="text-sm text-muted">Scan barcode produk — stok otomatis berkurang tiap kali terjual.</p>
      </div>
      <KasirScan
        initialSales={salesToday.map((s) => ({
          id: s.id,
          productName: s.productName,
          price: s.price,
          paymentMethod: s.paymentMethod,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
