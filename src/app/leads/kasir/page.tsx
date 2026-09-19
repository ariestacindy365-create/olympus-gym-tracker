import { getCurrentUser, requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import { KasirPage as KasirPageView } from "@/components/leads/KasirPage";

export default async function KasirRoute() {
  await requireAnyRole(["ADMIN", "OWNER"]);
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const today = todayDateKey();
  const [salesToday, products] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: today }, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Kasir</h1>
        <p className="text-sm text-muted">Scan barcode produk — stok otomatis berkurang tiap kali terjual.</p>
      </div>
      <KasirPageView
        isAdmin={isAdmin}
        initialSales={salesToday.map((s) => ({
          id: s.id,
          productName: s.productName,
          price: s.price,
          paymentMethod: s.paymentMethod,
          createdAt: s.createdAt.toISOString(),
        }))}
        products={products}
      />
    </div>
  );
}
