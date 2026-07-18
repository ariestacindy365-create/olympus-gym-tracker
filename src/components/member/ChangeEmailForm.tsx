"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (email.trim() === currentEmail) {
      setError("Email baru sama dengan yang lama.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/member/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengubah email.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Email</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">Email berhasil diubah. Pakai email baru untuk login berikutnya.</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Menyimpan..." : "Simpan Email"}
      </Button>
    </form>
  );
}
