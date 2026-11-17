"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Owner: how many places each class has. */
export function QuotaSetting({ initial }: { initial: number }) {
  const router = useRouter();
  const [quota, setQuota] = useState(String(initial));
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setNote(null);
    const res = await fetch("/api/bookings/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quota: Number(quota) }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setPending(false);
    setNote(res?.ok ? { tone: "ok", text: `Kuota tiap kelas: ${data.quota} orang.` } : { tone: "error", text: data?.error ?? "Gagal menyimpan." });
    if (res?.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <h2 className="font-display text-lg font-bold">Kuota per kelas</h2>
      <p className="text-xs text-muted">Berlaku untuk semua kelas. Kalau penuh, member masuk daftar tunggu.</p>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
          aria-label="Kuota per kelas"
          className="h-11 w-24 rounded-xl border border-border bg-surface px-3 text-base focus:border-accent focus:outline-none"
        />
        <button type="submit" disabled={pending} className="h-11 rounded-xl bg-accent px-4 font-bold text-white disabled:opacity-60">
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
      {note && <p className={`mt-2 text-sm ${note.tone === "ok" ? "text-success" : "text-danger"}`}>{note.text}</p>}
    </form>
  );
}
