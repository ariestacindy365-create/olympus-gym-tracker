"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { scanErrorFeedback, scanSuccessFeedback } from "@/lib/scanFeedback";
import { sessionById } from "@/lib/bookingRules";
import { jakartaToday } from "@/lib/birthDate";

interface Log {
  tone: "ok" | "warn" | "error";
  text: string;
  /** Offer to add a member without a booking to today's class. */
  add?: { userId: string; sessionId: string; name: string };
}

/** Front desk check-in: scan (or type) the code on the member's card. */
export function CheckInDesk() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [log, setLog] = useState<Log[]>([]);
  const queue = useRef<string[]>([]);
  const busy = useRef(false);

  useEffect(() => input.current?.focus(), []);

  async function run() {
    if (busy.current) return;
    busy.current = true;
    while (queue.current.length) {
      const c = queue.current.shift()!;
      const res = await fetch("/api/bookings/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c }) }).catch(() => null);
      const data = await res?.json().catch(() => ({}));
      let entry: Log;
      if (!res?.ok) {
        scanErrorFeedback();
        entry = { tone: "error", text: `${c}: ${data?.error ?? "Gagal check-in. Coba lagi."}` };
      } else if (!data.sessionId) {
        scanErrorFeedback();
        const s = data.suggest ? sessionById(data.suggest) : null;
        entry = {
          tone: "warn",
          text: `${data.member.name} belum booking kelas hari ini.`,
          add: s ? { userId: data.member.id, sessionId: s.id, name: s.name } : undefined,
        };
      } else {
        scanSuccessFeedback();
        entry = { tone: "ok", text: `${data.already ? "Sudah check-in" : "✓ Hadir"}: ${data.member.name} · kelas ${sessionById(data.sessionId)?.name ?? ""}` };
      }
      setLog((l) => [entry, ...l].slice(0, 6));
      router.refresh();
    }
    busy.current = false;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    // Emptied at once: a scanner types the next code a moment later.
    setCode("");
    if (!c) return;
    queue.current.push(c);
    void run();
  }

  async function add(i: number, a: NonNullable<Log["add"]>) {
    const res = await fetch("/api/bookings/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: a.userId, day: jakartaToday(), sessionId: a.sessionId }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setLog((l) => l.map((x, j) => (j === i ? { tone: res?.ok ? "ok" : "error", text: res?.ok ? `✓ Ditambahkan ke kelas ${a.name} (${data.label})` : (data?.error ?? "Gagal menambahkan.") } : x)));
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card" aria-label="Check-in member">
      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={input}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Scan kartu member (OLY-…)"
          aria-label="Kode check-in member"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-base focus:border-accent focus:outline-none"
        />
        <button type="submit" className="h-12 shrink-0 rounded-xl bg-accent px-4 font-bold text-white hover:bg-accent-2">
          Check-in
        </button>
      </form>
      {log.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5" aria-live="polite">
          {log.map((l, i) => (
            <li
              key={i}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${l.tone === "ok" ? "bg-success/10" : l.tone === "warn" ? "bg-[#f59e0b]/15" : "bg-danger/10 text-danger"}`}
            >
              <span>{l.text}</span>
              {l.add && (
                <button type="button" onClick={() => add(i, l.add!)} className="min-h-9 rounded-lg bg-accent px-3 text-xs font-bold text-white">
                  Tambah ke kelas {l.add.name}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
