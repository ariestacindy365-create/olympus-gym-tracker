"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatRupiah } from "@/lib/packages";

export interface PackageRow {
  id: string;
  name: string;
  price: number;
  durationDays: number | null;
  isActive: boolean;
}

function AddPackageForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceNum = Number(price);
    if (!name.trim() || !priceNum || priceNum <= 0) {
      setError("Isi nama paket dan harga yang valid.");
      return;
    }
    const durationDaysNum = Number(durationDays);
    setPending(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          price: priceNum,
          durationDays: durationDaysNum > 0 ? durationDaysNum : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambah paket.");
        return;
      }
      setName("");
      setPrice("");
      setDurationDays("");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-display text-lg font-semibold">Tambah Paket Baru</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Nama paket" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Harga (Rp)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="sm:max-w-[180px]"
        />
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Durasi (hari)"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          className="sm:max-w-[140px]"
        />
        <Button type="submit" disabled={pending} className="whitespace-nowrap">
          {pending ? "..." : "+ Tambah"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

function PackageRowItem({ pkg }: { pkg: PackageRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pkg.name);
  const [price, setPrice] = useState(String(pkg.price));
  const [durationDays, setDurationDays] = useState(pkg.durationDays ? String(pkg.durationDays) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
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

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Gagal menghapus.");
        return;
      }
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
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama paket" />
        <Input
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Harga (Rp)"
        />
        <Input
          type="number"
          inputMode="numeric"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          placeholder="Durasi (hari, opsional)"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button
            className="px-3 py-1.5 text-xs"
            disabled={pending}
            onClick={() => {
              const durationDaysNum = Number(durationDays);
              patch({
                name: name.trim(),
                price: Number(price),
                durationDays: durationDaysNum > 0 ? durationDaysNum : null,
              });
            }}
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
        <p className={`font-medium ${!pkg.isActive ? "text-muted line-through" : ""}`}>{pkg.name}</p>
        <p className="text-sm text-muted">
          {formatRupiah(pkg.price)}
          {pkg.durationDays ? ` · ${pkg.durationDays} hari` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={pkg.isActive ? "success" : "muted"}>{pkg.isActive ? "Aktif" : "Nonaktif"}</Badge>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button
          variant={pkg.isActive ? "danger" : "secondary"}
          className="px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={() => patch({ isActive: !pkg.isActive })}
        >
          {pending ? "..." : pkg.isActive ? "Nonaktifkan" : "Aktifkan"}
        </Button>
        <Button variant="danger" className="px-3 py-1.5 text-xs" disabled={pending} onClick={handleDelete}>
          {pending ? "..." : "Hapus"}
        </Button>
      </div>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </Card>
  );
}

export function PackageListManager({ packages }: { packages: PackageRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <AddPackageForm />
      <div className="flex flex-col gap-2">
        {packages.length === 0 && <p className="text-sm text-muted">Belum ada paket.</p>}
        {packages.map((pkg) => (
          <PackageRowItem key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </div>
  );
}
