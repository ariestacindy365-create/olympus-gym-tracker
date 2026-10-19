"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Switch for showing/hiding the member on the monthly leaderboard. */
export function LeaderboardOptOutToggle({ initialOptOut }: { initialOptOut: boolean }) {
  const router = useRouter();
  const [optOut, setOptOut] = useState(initialOptOut);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function toggle() {
    const next = !optOut;
    setOptOut(next);
    setStatus("saving");
    try {
      const res = await fetch("/api/member/leaderboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optOut: next }),
      });
      if (!res.ok) throw new Error();
      setStatus("idle");
      router.refresh();
    } catch {
      setOptOut(!next);
      setStatus("error");
    }
  }

  const visible = !optOut;
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">Tampilkan saya di peringkat</p>
        <p className={`text-xs ${status === "error" ? "text-danger" : "text-muted"}`}>
          {status === "error"
            ? "Gagal menyimpan. Coba lagi."
            : visible
              ? "Nama dan angkamu terlihat oleh member lain."
              : "Kamu disembunyikan. Kamu tetap bisa melihat peringkat."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label="Tampilkan saya di peringkat"
        onClick={toggle}
        disabled={status === "saving"}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${visible ? "bg-accent" : "bg-border-strong"}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${visible ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
