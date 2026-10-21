"use client";

import { useState } from "react";

type Visibility = "ALL" | "COACH" | "PRIVATE";

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: "ALL", label: "Semua member" },
  { value: "COACH", label: "Hanya pelatih" },
  { value: "PRIVATE", label: "Hanya saya" },
];

/** Default "Dilihat oleh" for workouts saved from "Selesai latihan hari ini". */
export function FeedVisibilitySetting({ initial }: { initial: Visibility }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function change(next: Visibility) {
    const prev = value;
    setValue(next);
    setStatus("saving");
    try {
      const res = await fetch("/api/member/feed-visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch {
      setValue(prev);
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">Latihan dibagikan ke Feed</p>
        <p className={`text-xs ${status === "error" ? "text-danger" : "text-muted"}`}>
          {status === "error"
            ? "Gagal menyimpan. Coba lagi."
            : status === "saved"
              ? "Tersimpan. Bisa diubah lagi setiap kali menyimpan latihan."
              : "Pilihan awal saat kamu menyimpan latihan."}
        </p>
      </div>
      <select
        value={value}
        onChange={(e) => change(e.target.value as Visibility)}
        disabled={status === "saving"}
        aria-label="Latihan dibagikan ke Feed"
        className="h-10 shrink-0 rounded-lg border border-border bg-surface px-2 text-sm font-semibold focus:border-accent focus:outline-none disabled:opacity-60"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
