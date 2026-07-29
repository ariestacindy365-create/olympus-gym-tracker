"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LeadHeader({ leadId, name, waNumber }: { leadId: string; name: string; waNumber: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editWaNumber, setEditWaNumber] = useState(waNumber);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, waNumber: editWaNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan.");
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
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/leads");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Gagal menghapus.");
      }
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="flex flex-col gap-2">
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama calon klien" required />
        <Input value={editWaNumber} onChange={(e) => setEditWaNumber(e.target.value)} placeholder="Nomor WA" required />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="text-sm">
            {pending ? "..." : "Simpan"}
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditing(false)} className="text-sm">
            Batal
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{name}</h1>
        <p className="text-sm text-muted">{waNumber}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="text-xs" disabled={pending} onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button variant="danger" className="text-xs" disabled={pending} onClick={handleDelete}>
          {pending ? "..." : "Hapus"}
        </Button>
      </div>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
