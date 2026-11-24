"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";

/** `full`: a plain "Keluar dari akun" button (the member's Akun page) instead of the header icon. */
export function LogoutButton({ full = false }: { full?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const confirmDialog = useConfirm();

  async function handleLogout() {
    // The icon sits next to others on a phone: ask before signing out.
    const ok = await confirmDialog({ title: "Yakin mau keluar?", description: "Nanti masuk lagi pakai email dan PIN kamu.", confirmLabel: "Keluar" });
    if (!ok) return;
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (full) {
    return (
      <Button variant="secondary" onClick={handleLogout} disabled={pending} className="w-full !text-danger">
        {pending ? "Keluar..." : "Keluar dari akun"}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      disabled={pending}
      aria-label="Keluar"
      className="px-2 py-1.5 text-xs !text-nav-muted hover:!bg-white/10 hover:!text-nav-foreground"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M8 4H5a1 1 0 00-1 1v10a1 1 0 001 1h3M13 14l4-4-4-4M17 10H8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline">{pending ? "..." : "Keluar"}</span>
    </Button>
  );
}
