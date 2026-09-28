"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    const ok = await confirmDialog({
      title: "Hapus pembayaran?",
      description: "Aksi ini akan tercatat dan terlihat oleh owner.",
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    setPending(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Gagal menghapus pembayaran.");
        return;
      }
      toast.success("Pembayaran dihapus.");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
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
