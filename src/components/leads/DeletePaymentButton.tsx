"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Yakin ingin menghapus pembayaran ini? Aksi ini akan tercatat dan terlihat oleh owner.")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Gagal menghapus pembayaran.");
        return;
      }
      router.refresh();
    } catch {
      alert("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="danger" className="px-3 py-1.5 text-xs" disabled={pending} onClick={handleDelete}>
      {pending ? "..." : "Hapus"}
    </Button>
  );
}
