"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function SendDailyReportButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function send() {
    setPending(true);
    setResult(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/cron/daily-report");
      const data = await res.json();
      if (!res.ok) {
        setResult("error");
        setErrorMessage(data.error ?? "Gagal mengirim laporan.");
        return;
      }
      setResult("ok");
    } catch {
      setResult("error");
      setErrorMessage("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={pending} onClick={send}>
        {pending ? "Mengirim..." : "Kirim Laporan ke Telegram Sekarang"}
      </Button>
      {result === "ok" && <span className="text-xs text-success">Terkirim.</span>}
      {result === "error" && <span className="text-xs text-danger">{errorMessage}</span>}
    </div>
  );
}
