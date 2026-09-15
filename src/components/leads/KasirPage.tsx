"use client";

import { useState } from "react";
import { KasirScan, type SaleRow } from "@/components/leads/KasirScan";
import { ProductListManager, type ProductRow } from "@/components/leads/ProductListManager";

export function KasirPage({
  isAdmin,
  initialSales,
  products,
}: {
  isAdmin: boolean;
  initialSales: SaleRow[];
  products: ProductRow[];
}) {
  const [tab, setTab] = useState<"scan" | "produk">("scan");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("scan")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            tab === "scan" ? "bg-accent text-background" : "bg-surface-2 text-muted hover:text-foreground"
          }`}
        >
          Scan
        </button>
        <button
          type="button"
          onClick={() => setTab("produk")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            tab === "produk" ? "bg-accent text-background" : "bg-surface-2 text-muted hover:text-foreground"
          }`}
        >
          Kelola Produk
        </button>
      </div>

      {tab === "scan" ? (
        <KasirScan initialSales={initialSales} isAdmin={isAdmin} />
      ) : (
        <ProductListManager products={products} isAdmin={isAdmin} />
      )}
    </div>
  );
}
