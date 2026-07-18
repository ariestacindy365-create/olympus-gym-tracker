"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PinInput } from "@/components/ui/PinInput";

export function ChangePinForm() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (currentPin.length !== 4 || newPin.length !== 4) {
      setError("Isi PIN saat ini dan PIN baru (4 digit).");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/member/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengubah PIN.");
        return;
      }
      setSuccess(true);
      setCurrentPin("");
      setNewPin("");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
          PIN Saat Ini
        </label>
        <PinInput value={currentPin} onChange={setCurrentPin} disabled={pending} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">PIN Baru</label>
        <PinInput value={newPin} onChange={setNewPin} disabled={pending} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">PIN berhasil diubah. Pakai PIN baru untuk login berikutnya.</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Menyimpan..." : "Simpan PIN"}
      </Button>
    </form>
  );
}
