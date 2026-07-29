"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PinInput } from "@/components/ui/PinInput";
import { OlympusLogo } from "@/components/ui/OlympusLogo";
import { roleHomePath } from "@/lib/roles";

export default function RegisterAdminPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pin.length !== 4) {
      setError("Pilih PIN 4 digit.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN tidak sama.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/register-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, pin, inviteCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal membuat akun.");
        setPending(false);
        return;
      }

      router.push(roleHomePath(data.role));
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <OlympusLogo height={64} />
          <p className="mt-2 text-sm text-muted">Daftar Akun Admin</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Nama
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Nama Anda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="kamu@olympus.gym"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="inviteCode" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Kode Registrasi Admin
            </label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="Minta ke owner Olympus"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Pilih PIN 4 Digit
            </label>
            <PinInput value={pin} onChange={setPin} disabled={pending} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Konfirmasi PIN
            </label>
            <PinInput value={confirmPin} onChange={setConfirmPin} disabled={pending} />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Membuat akun..." : "Buat Akun Admin"}
          </Button>

          <p className="text-center text-sm text-muted">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Masuk
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
