"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type LeadStatus = "DM" | "TRIAL" | "MEMBER" | "RETENSI" | "LOST";

const NEXT_ACTIONS: Record<LeadStatus, { label: string; status: LeadStatus; variant: "primary" | "secondary" | "danger" }[]> = {
  DM: [
    { label: "Tandai Trial", status: "TRIAL", variant: "primary" },
    { label: "Tidak Lanjut", status: "LOST", variant: "danger" },
  ],
  TRIAL: [
    { label: "Tandai Member", status: "MEMBER", variant: "primary" },
    { label: "Tidak Lanjut", status: "LOST", variant: "danger" },
  ],
  MEMBER: [{ label: "Tandai Retensi", status: "RETENSI", variant: "secondary" }],
  RETENSI: [],
  LOST: [],
};

export function LeadStatusActions({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = NEXT_ACTIONS[status];
  if (actions.length === 0) return null;

  async function setStatus(nextStatus: LeadStatus) {
    setPending(nextStatus);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengubah status.");
        return;
      }
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.status}
            variant={action.variant}
            disabled={pending !== null}
            onClick={() => setStatus(action.status)}
          >
            {pending === action.status ? "..." : action.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
