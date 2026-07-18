"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PinInput } from "@/components/ui/PinInput";
import { OlympusLogo } from "@/components/ui/OlympusLogo";

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

      router.push(data.role === "COACH" ? "/coach/dashboard" : "/member/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <OlympusLogo height={64} />
          <p className="mt-2 text-sm text-muted">Lifting Club Gym Tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6">
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

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-sm text-muted">
            New here?{" "}
            <Link href="/register" className="text-accent hover:underline">
              Create a member account
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
