import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductListManager } from "@/components/leads/ProductListManager";

export default async function ProductsPage() {
  await requireRole("OWNER");

  const products = await prisma.product.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Produk (Makanan &amp; Minuman)</h1>
        <p className="text-sm text-muted">
          Katalog produk yang bisa di-scan di Kasir. Produk nonaktif tidak bisa dijual, tapi riwayat penjualan lama
          tetap tidak berubah.
        </p>
      </div>
      <ProductListManager products={products} />
    </div>
  );
}
