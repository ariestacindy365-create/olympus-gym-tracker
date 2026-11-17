"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { BOOKING_STATUS_LABEL } from "@/lib/bookingRules";

export interface RosterEntry {
  id: string;
  name: string;
  status: keyof typeof BOOKING_STATUS_LABEL;
  membership: string;
  byAdmin: boolean;
}

const TONE: Record<string, string> = {
  BOOKED: "bg-accent/10 text-accent",
  WAITLIST: "bg-[#f59e0b]/15 text-[#b45309]",
  ATTENDED: "bg-success/10 text-success",
  NO_SHOW: "bg-danger/10 text-danger",
};

/** One class's participants: Hadir / Tidak hadir / Hapus, the waiting list, and Tambah member. */
export function ClassRoster({ day, sessionId, title, entries, quota }: { day: string; sessionId: string; title: string; entries: RosterEntry[]; quota: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ id: string; name: string }[]>([]);
  const places = entries.filter((e) => e.status !== "WAITLIST");
  const waiting = entries.filter((e) => e.status === "WAITLIST");

  async function act(e: RosterEntry, action: "ATTENDED" | "NO_SHOW" | "REMOVE") {
    if (action === "REMOVE" && !(await confirm({ title: `Hapus ${e.name}?`, description: "Dihapus dari kelas ini dan kreditnya kembali. Daftar tunggu otomatis naik.", confirmLabel: "Hapus", danger: true }))) return;
    setPending(e.id);
    setError(null);
    const res = await fetch(`/api/bookings/${e.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setPending(null);
    if (!res?.ok) setError(data?.error ?? "Gagal menyimpan. Coba lagi.");
    router.refresh();
  }

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) return setFound([]);
    const res = await fetch(`/api/bookings/members?q=${encodeURIComponent(q.trim())}`).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setFound(data?.members ?? []);
  }

  async function add(m: { id: string; name: string }) {
    setPending(m.id);
    setError(null);
    const res = await fetch("/api/bookings/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: m.id, day, sessionId }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setPending(null);
    if (!res?.ok) return setError(data?.error ?? "Gagal menambahkan.");
    setQuery("");
    setFound([]);
    router.refresh();
  }

  const row = (e: RosterEntry, i: number) => (
    <li key={e.id} className="flex flex-col gap-2 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            <span className="mr-1.5 text-muted">{i + 1}.</span>
            {e.name}
          </p>
          <p className="text-xs text-muted">
            {e.membership}
            {e.byAdmin ? " · ditambah admin" : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${TONE[e.status] ?? ""}`}>{BOOKING_STATUS_LABEL[e.status]}</span>
      </div>
      <div className="flex gap-1.5">
        {(["ATTENDED", "NO_SHOW"] as const).map((a) => (
          <button
            key={a}
            type="button"
            disabled={pending === e.id || e.status === a}
            onClick={() => act(e, a)}
            className={`h-10 flex-1 rounded-lg border text-sm font-semibold disabled:opacity-50 ${a === "ATTENDED" ? "border-success/40 text-success" : "border-danger/30 text-danger"}`}
          >
            {a === "ATTENDED" ? "Hadir" : "Tidak hadir"}
          </button>
        ))}
        <button type="button" disabled={pending === e.id} onClick={() => act(e, "REMOVE")} className="h-10 flex-1 rounded-lg border border-border text-sm font-semibold text-muted disabled:opacity-50">
          Hapus
        </button>
      </div>
    </li>
  );

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card" aria-label={`Peserta ${title}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <span className="text-sm text-muted">
          {places.length}/{quota}
        </span>
      </div>
      {error && <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {places.length === 0 ? <p className="py-3 text-sm text-muted">Belum ada yang booking.</p> : <ul className="divide-y divide-border">{places.map(row)}</ul>}
      {waiting.length > 0 && (
        <>
          <h3 className="mt-3 text-sm font-bold uppercase tracking-wide text-muted">Daftar tunggu</h3>
          <ul className="divide-y divide-border">{waiting.map(row)}</ul>
        </>
      )}
      <div className="mt-3 border-t border-border pt-3">
        <label className="text-sm font-semibold" htmlFor={`add-${sessionId}`}>
          Tambah member
        </label>
        <input
          id={`add-${sessionId}`}
          value={query}
          onChange={(e) => void search(e.target.value)}
          placeholder="Ketik nama member"
          autoComplete="off"
          className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus:border-accent focus:outline-none"
        />
        {found.length > 0 && (
          <ul className="mt-1 divide-y divide-border rounded-xl border border-border">
            {found.map((m) => (
              <li key={m.id}>
                <button type="button" disabled={pending === m.id} onClick={() => add(m)} className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm">
                  {m.name}
                  <span className="font-semibold text-accent">+ Tambah</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-muted">Dari meja admin boleh melebihi kuota dan tanpa membership.</p>
      </div>
    </section>
  );
}
