"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PinInput } from "@/components/ui/PinInput";
import { OlympusLogo } from "@/components/ui/OlympusLogo";
import { roleHomePath } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pin.length !== 4) {
      setError("Isi PIN 4 digit Anda.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal masuk.");
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
    <main className="flex flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--color-accent)/8%,_transparent_60%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <OlympusLogo height={64} />
          <p className="mt-2 text-sm text-muted">Lifting Club Gym Tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-lg shadow-accent/5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@olympus.gym"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              PIN 4 Digit
            </label>
            <PinInput value={pin} onChange={setPin} disabled={pending} />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Sedang masuk..." : "Masuk"}
          </Button>

          <p className="text-center text-sm text-muted">
            Baru di sini?{" "}
            <Link href="/register" className="text-accent hover:underline">
              Buat akun member
            </Link>
          </p>
          <p className="text-center text-xs text-muted">
            Admin baru?{" "}
            <Link href="/register-admin" className="text-accent hover:underline">
              Daftar akun admin
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
