"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const confirmDialog = useConfirm();

  async function handleLogout() {
    // The icon sits next to others on a phone: ask before signing out.
    const ok = await confirmDialog({ title: "Keluar dari akun?", description: "Kamu perlu masuk lagi dengan email dan PIN.", confirmLabel: "Keluar" });
    if (!ok) return;
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
