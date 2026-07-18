"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PinInput } from "@/components/ui/PinInput";
import { OlympusLogo } from "@/components/ui/OlympusLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pin.length !== 4) {
      setError("Choose a 4-digit PIN.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not create your account.");
        setPending(false);
        return;
      }

      router.push("/member/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <OlympusLogo height={64} />
          <p className="mt-2 text-sm text-muted">Create Your Member Account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
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
              placeholder="you@olympus.gym"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Choose a 4-Digit PIN
            </label>
            <PinInput value={pin} onChange={setPin} disabled={pending} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Confirm PIN
            </label>
            <PinInput value={confirmPin} onChange={setConfirmPin} disabled={pending} />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Creating account..." : "Create Account"}
          </Button>

          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
