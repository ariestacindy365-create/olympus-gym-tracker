"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatRupiah } from "@/lib/packages";

export interface ProductRow {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

function AddProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceNum = Number(price);
    if (!name.trim() || !barcode.trim() || !priceNum || priceNum <= 0) {
      setError("Isi nama, barcode, dan harga yang valid.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          barcode: barcode.trim(),
          price: priceNum,
          stock: Number(stock) > 0 ? Number(stock) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambah produk.");
        return;
      }
      setName("");
      setBarcode("");
      setPrice("");
      setStock("");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-display text-lg font-semibold">Tambah Produk Baru</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input placeholder="Nama produk" value={name} onChange={(e) => setName(e.target.value)} className="sm:max-w-[200px]" />
        <Input
          placeholder="Scan atau ketik barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className="sm:max-w-[180px]"
        />
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Harga (Rp)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="sm:max-w-[140px]"
        />
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Stok awal"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="sm:max-w-[120px]"
        />
        <Button type="submit" disabled={pending} className="whitespace-nowrap">
          {pending ? "..." : "+ Tambah"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

function LowStockBanner({ products }: { products: ProductRow[] }) {
  const lowStock = products.filter((p) => p.isActive && p.stock <= p.lowStockThreshold);
  if (lowStock.length === 0) return null;

  return (
    <Card className="border-danger/40 bg-danger/5">
      <p className="mb-2 text-sm font-semibold text-danger">Stok Menipis ({lowStock.length} produk)</p>
      <ul className="flex flex-col gap-1 text-sm text-danger">
        {lowStock.map((p) => (
          <li key={p.id}>
            {p.name} — sisa {p.stock} (batas {p.lowStockThreshold})
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RestockControl({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRestock() {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Isi jumlah yang valid.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Gagal menambah stok.");
        return;
      }
      setQuantity("");
      setOpen(false);
      onDone();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>
        + Stok
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        inputMode="numeric"
        placeholder="Jumlah"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-20 px-2 py-1 text-xs"
      />
      <Button className="px-2 py-1 text-xs" disabled={pending} onClick={handleRestock}>
        {pending ? "..." : "OK"}
      </Button>
      <Button variant="ghost" className="px-2 py-1 text-xs" disabled={pending} onClick={() => setOpen(false)}>
        Batal
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function ProductRowItem({
  product,
  canEdit,
  onChanged,
}: {
  product: ProductRow;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [barcode, setBarcode] = useState(product.barcode);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(product.lowStockThreshold));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Gagal menyimpan.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <Card className="flex flex-col gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama produk" />
        <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode" />
        <Input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga (Rp)" />
        <Input type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stok" />
        <div>
          <label className="mb-1 block text-xs text-muted">Batas Stok Menipis</label>
          <Input
            type="number"
            inputMode="numeric"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            placeholder="Batas stok menipis"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button
            className="px-3 py-1.5 text-xs"
            disabled={pending}
            onClick={() =>
              patch({
                name: name.trim(),
                barcode: barcode.trim(),
                price: Number(price),
                stock: Number(stock),
                lowStockThreshold: Number(lowStockThreshold),
              })
            }
          >
            {pending ? "..." : "Simpan"}
          </Button>
          <Button variant="ghost" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => setEditing(false)}>
            Batal
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className={`font-medium ${!product.isActive ? "text-muted line-through" : ""}`}>{product.name}</p>
        <p className="text-sm text-muted">
          {formatRupiah(product.price)} · barcode {product.barcode} ·{" "}
          <span className={product.stock <= product.lowStockThreshold ? "font-medium text-danger" : ""}>
            stok {product.stock}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={product.isActive ? "success" : "muted"}>{product.isActive ? "Aktif" : "Nonaktif"}</Badge>
        {canEdit && (
          <>
            <RestockControl productId={product.id} onDone={onChanged} />
            <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              variant={product.isActive ? "danger" : "secondary"}
              className="px-3 py-1.5 text-xs"
              disabled={pending}
              onClick={() => patch({ isActive: !product.isActive })}
            >
              {pending ? "..." : product.isActive ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </>
        )}
      </div>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </Card>
  );
}

export function ProductListManager({ products, isAdmin }: { products: ProductRow[]; isAdmin: boolean }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <LowStockBanner products={products} />
      {isAdmin && <AddProductForm />}
      <div className="flex flex-col gap-2">
        {products.length === 0 && <p className="text-sm text-muted">Belum ada produk.</p>}
        {products.map((product) => (
          <ProductRowItem key={product.id} product={product} canEdit={isAdmin} onChanged={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}
