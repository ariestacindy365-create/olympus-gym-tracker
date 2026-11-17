"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export interface BoardDay {
  day: string;
  weekday: string;
  date: string;
  /** The member has a place in a class that day. */
  booked: boolean;
}

export interface BoardClass {
  sessionId: string;
  name: string;
  coach: string | null;
  booked: number;
  waitlist: number;
  quota: number;
  started: boolean;
  mine: { id: string; status: string; canCancel: boolean; position: number | null } | null;
}

/** Day tabs, then the day's classes with places left and the member's own booking. */
export function BookingBoard({ days, selected, classes, canBook, cancelHours }: { days: BoardDay[]; selected: string; classes: BoardClass[]; canBook: boolean; cancelHours: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function book(c: BoardClass) {
    setPending(c.sessionId);
    setMessage(null);
    const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day: selected, sessionId: c.sessionId }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setPending(null);
    if (!res?.ok) return setMessage({ tone: "error", text: data?.error ?? "Gagal booking. Coba lagi." });
    setMessage({ tone: "ok", text: data.status === "WAITLIST" ? `Kelas ${c.name} penuh: kamu masuk daftar tunggu. Kalau ada tempat, kamu otomatis naik dan dapat notifikasi.` : `✓ Booked: kelas ${c.name}. 1 kredit terpakai.` });
    router.refresh();
  }

  async function cancel(c: BoardClass) {
    if (!c.mine) return;
    const waiting = c.mine.status === "WAITLIST";
    if (!(await confirm({ title: waiting ? "Keluar dari daftar tunggu?" : "Batalkan booking?", description: waiting ? `Kelas ${c.name}.` : `Kelas ${c.name}. Kreditnya kembali.`, confirmLabel: waiting ? "Keluar" : "Batalkan booking", danger: true }))) return;
    setPending(c.sessionId);
    setMessage(null);
    const res = await fetch(`/api/bookings/${c.mine.id}`, { method: "DELETE" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setPending(null);
    if (!res?.ok) return setMessage({ tone: "error", text: data?.error ?? "Gagal membatalkan. Coba lagi." });
    setMessage({ tone: "ok", text: waiting ? "Kamu keluar dari daftar tunggu." : "Booking dibatalkan, kredit kembali." });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Pilih hari" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {days.map((d) => (
          <Link
            key={d.day}
            href={`/member/booking?tgl=${d.day}`}
            scroll={false}
            aria-current={d.day === selected ? "date" : undefined}
            className={`relative flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 ${d.day === selected ? "border-accent bg-accent text-white" : "border-border bg-surface"}`}
          >
            <span className="text-[11px] font-semibold uppercase">{d.weekday}</span>
            <span className="font-display text-lg font-bold leading-tight">{d.date}</span>
            {d.booked && <span aria-label="ada booking" className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${d.day === selected ? "bg-white" : "bg-accent"}`} />}
          </Link>
        ))}
      </nav>

      {!canBook && (
        <p className="rounded-xl bg-[#f59e0b]/15 px-3 py-2 text-sm">
          Belum ada membership dengan sisa kredit untuk hari ini.{" "}
          <Link href="/member/paket" className="font-semibold text-accent">
            Beli paket
          </Link>{" "}
          untuk bisa booking.
        </p>
      )}
      {message && (
        <p role="status" className={`rounded-xl px-3 py-2 text-sm ${message.tone === "ok" ? "bg-success/10" : "bg-danger/10 text-danger"}`}>
          {message.text}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {classes.map((c) => {
          const left = Math.max(0, c.quota - c.booked);
          const full = left === 0;
          const mine = c.mine;
          const busy = pending === c.sessionId;
          return (
            <li key={c.sessionId} className={`rounded-2xl border bg-surface p-3 shadow-card ${mine && mine.status !== "WAITLIST" ? "border-accent" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold leading-tight">{c.name}</p>
                  <p className="text-sm text-muted">{c.coach ?? "Coach belum diatur"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold ${full ? "text-danger" : "text-foreground"}`}>{full ? "Penuh" : `${left} tempat lagi`}</p>
                  <p className="text-xs text-muted">
                    {c.booked}/{c.quota}
                    {c.waitlist > 0 ? ` · ${c.waitlist} menunggu` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">
                  {mine?.status === "BOOKED" && <span className="text-accent">✓ Kamu sudah booking</span>}
                  {mine?.status === "ATTENDED" && <span className="text-success">✓ Hadir</span>}
                  {mine?.status === "NO_SHOW" && <span className="text-danger">Tidak hadir</span>}
                  {mine?.status === "WAITLIST" && <span className="text-[#b45309]">Daftar tunggu · urutan {mine.position}</span>}
                </span>
                {mine ? (
                  (mine.status === "BOOKED" || mine.status === "WAITLIST") &&
                  (mine.canCancel && !c.started ? (
                    <button type="button" onClick={() => cancel(c)} disabled={busy} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-danger disabled:opacity-60">
                      {busy ? "…" : mine.status === "WAITLIST" ? "Keluar antrean" : "Batalkan"}
                    </button>
                  ) : (
                    <span className="text-right text-xs text-muted">{c.started ? "Kelas sudah mulai" : `Batal ditutup ${cancelHours} jam sebelum kelas`}</span>
                  ))
                ) : c.started ? (
                  <span className="text-xs text-muted">Kelas sudah mulai</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => book(c)}
                    disabled={busy || !canBook}
                    className={`h-10 rounded-xl px-5 text-sm font-bold disabled:opacity-50 ${full ? "border border-accent text-accent" : "bg-accent text-white hover:bg-accent-2"}`}
                  >
                    {busy ? "…" : full ? "Daftar tunggu" : "Booking"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
