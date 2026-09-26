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
      setError("Enter your 4-digit PIN.");
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
        setError(data.error ?? "Login failed.");
        setPending(false);
        return;
      }

      router.push(roleHomePath(data.role));
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[45vh] min-h-[18rem] rounded-b-[2.5rem] bg-nav-bg [background-image:radial-gradient(60rem_22rem_at_50%_-4rem,rgb(37_99_235/0.5),transparent)]"
      />
      <div className="relative w-full max-w-sm animate-pop-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <OlympusLogo height={64} variant="light" />
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-nav-muted">Lifting Club Gym Tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 shadow-raised">
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
              4-Digit PIN
            </label>
            <PinInput value={pin} onChange={setPin} disabled={pending} />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-sm text-muted">
            New here?{" "}
            <Link href="/register" className="font-medium text-accent hover:underline">
              Create a member account
            </Link>
          </p>
          <p className="text-center text-xs text-muted">
            Admin baru?{" "}
            <Link href="/register-admin" className="font-medium text-accent hover:underline">
              Daftar akun admin
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
