"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
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
      className="px-2 py-1.5 text-xs !text-nav-muted hover:!text-nav-foreground"
    >
      {pending ? "..." : "Log out"}
    </Button>
  );
}
