"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function TargetEditForm({
  adminId,
  targetCapture,
  targetFollowup,
}: {
  adminId: string;
  targetCapture: number;
  targetFollowup: number;
}) {
  const router = useRouter();
  const [capture, setCapture] = useState(targetCapture);
  const [followup, setFollowup] = useState(targetFollowup);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/targets/${adminId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCapture: capture, targetFollowup: followup }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan target.");
        return;
      }
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs text-muted">Target Capture/hari</label>
        <Input
          type="number"
          min={0}
          value={capture}
          onChange={(e) => setCapture(Number(e.target.value))}
          className="w-28"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Target Follow Up/hari</label>
        <Input
          type="number"
          min={0}
          value={followup}
          onChange={(e) => setFollowup(Number(e.target.value))}
          className="w-28"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="px-3 py-2.5 text-xs">
        {pending ? "..." : "Simpan"}
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
