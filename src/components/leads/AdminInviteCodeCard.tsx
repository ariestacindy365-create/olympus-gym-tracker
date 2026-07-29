"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function AdminInviteCodeCard({ code }: { code: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold">Kode Registrasi Admin</h2>
      <p className="mb-3 text-xs text-muted">
        Bagikan kode ini ke calon admin baru — mereka pakai ini untuk daftar sendiri di /register-admin.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2.5 font-mono text-sm tracking-wider">
          {code}
        </code>
        <Button type="button" variant="secondary" onClick={handleCopy} className="whitespace-nowrap text-sm">
          {status === "copied" ? "Tersalin!" : status === "error" ? "Gagal, salin manual" : "Salin"}
        </Button>
      </div>
    </Card>
  );
}
