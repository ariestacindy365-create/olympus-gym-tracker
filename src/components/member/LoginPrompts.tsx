"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MONTHS_ID, MAX_AGE, MIN_AGE, daysInMonth, jakartaToday } from "@/lib/birthDate";
import { currentSubscription, enablePush, pushSupport } from "@/lib/pushClient";

const SNOOZE_KEY = "olympus-push-prompt-until";
const SNOOZE_DAYS = 7;

function snoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function Modal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-overlay animate-pop-in">{children}</div>
    </div>
  );
}

/**
 * What a member is asked when they log in: their date of birth first
 * (required, the pop-up can't be closed), then to turn on notifications
 * (until they're on, or "Nanti saja" for a week).
 */
export function LoginPrompts({ needBirthDate }: { needBirthDate: boolean }) {
  const [askBirth, setAskBirth] = useState(needBirthDate);
  return askBirth ? <BirthDatePrompt onSaved={() => setAskBirth(false)} /> : <PushPopup />;
}

/** The date-of-birth form; `onCancel` adds Batal (changing it from Akun), without it the pop-up can't be closed. */
export function BirthDatePrompt({ onSaved, onCancel, initial }: { onSaved: () => void; onCancel?: () => void; initial?: string | null }) {
  const router = useRouter();
  const thisYear = Number(jakartaToday().slice(0, 4));
  const [iy, im, id] = initial ? initial.split("-").map((v) => String(Number(v))) : ["", "", ""];
  const [day, setDay] = useState(id);
  const [month, setMonth] = useState(im);
  const [year, setYear] = useState(iy);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxDay = year && month ? daysInMonth(Number(year), Number(month)) : 31;
  const select = "h-12 w-full rounded-xl border border-border bg-surface px-2 text-base focus:border-accent focus:outline-none";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!day || !month || !year) {
      setError("Pilih tanggal, bulan, dan tahun lahir.");
      return;
    }
    setPending(true);
    setError(null);
    const birthDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const res = await fetch("/api/member/birth-date", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setPending(false);
    if (!res?.ok) {
      setError(data?.error ?? "Gagal menyimpan. Periksa koneksi lalu coba lagi.");
      return;
    }
    onSaved();
    router.refresh();
  }

  return (
    <Modal label="Isi tanggal lahir">
      <form onSubmit={save} className="flex flex-col gap-3">
        <p className="text-3xl" aria-hidden>
          🎂
        </p>
        <p className="font-display text-2xl font-bold">Tanggal lahirmu</p>
        <p className="text-sm text-muted">Isi sekali saja untuk data member Olympus. Tanggal lahir tidak ditampilkan ke member lain.</p>
        <div className="grid grid-cols-[1fr_1.6fr_1.3fr] gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Tanggal
            <select value={day} onChange={(e) => setDay(e.target.value)} className={select} required>
              <option value="">–</option>
              {Array.from({ length: maxDay }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Bulan
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                if (year && e.target.value && Number(day) > daysInMonth(Number(year), Number(e.target.value))) setDay("");
              }}
              className={select}
              required
            >
              <option value="">–</option>
              {MONTHS_ID.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Tahun
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                if (month && e.target.value && Number(day) > daysInMonth(Number(e.target.value), Number(month))) setDay("");
              }}
              className={select}
              required
            >
              <option value="">–</option>
              {Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => thisYear - MIN_AGE - i).map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="mt-1 h-12 rounded-xl bg-accent font-bold text-white hover:bg-accent-2 disabled:opacity-60">
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={pending} className="h-11 text-sm font-semibold text-muted hover:text-foreground">
            Batal
          </button>
        )}
      </form>
    </Modal>
  );
}

type PushState = "hidden" | "ask" | "ios" | "working" | "done" | "denied";

function PushPopup() {
  const [state, setState] = useState<PushState>("hidden");

  useEffect(() => {
    // Browser-only checks, run once after mount.
    if (snoozed()) return;
    const support = pushSupport();
    if (support === "ios-install") {
      queueMicrotask(() => setState("ios"));
      return;
    }
    if (support !== "ok" || Notification.permission === "denied") return;
    currentSubscription().then((sub) => !sub && setState("ask"), () => {});
  }, []);

  useEffect(() => {
    if (state !== "done") return;
    const t = setTimeout(() => setState("hidden"), 2000);
    return () => clearTimeout(t);
  }, [state]);

  function later() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    } catch {
      // Storage blocked: it just asks again next visit.
    }
    setState("hidden");
  }

  async function enable() {
    setState("working");
    const r = await enablePush();
    setState(r === "on" ? "done" : r === "denied" ? "denied" : "ask");
  }

  if (state === "hidden") return null;
  return (
    <Modal label="Hidupkan notifikasi">
      <div className="flex flex-col gap-3">
        <p className="text-3xl" aria-hidden>
          🔔
        </p>
        {state === "done" ? (
          <p className="font-display text-2xl font-bold">✓ Notifikasi aktif di HP ini</p>
        ) : (
          <>
            <p className="font-display text-2xl font-bold">Hidupkan notifikasi</p>
            <p className="text-sm text-muted">
              {state === "ios"
                ? "Di iPhone: buka di Safari, tekan Bagikan → \"Tambah ke Layar Utama\", lalu buka Olympus dari layar utama untuk mengaktifkan notifikasi."
                : state === "denied"
                  ? "Notifikasi diblokir browser. Izinkan lewat pengaturan situs (ikon gembok di kolom alamat), lalu muat ulang."
                  : "Dapat kabar booking kelas, 💪 dan komentar, catatan coach, program pagi, dan pengingat catat latihan, walau aplikasi ditutup."}
            </p>
            {(state === "ask" || state === "working") && (
              <button
                type="button"
                onClick={enable}
                disabled={state === "working"}
                className="h-12 rounded-xl bg-accent font-bold text-white hover:bg-accent-2 disabled:opacity-60"
              >
                {state === "working" ? "Mengaktifkan…" : "Hidupkan notifikasi"}
              </button>
            )}
            <button type="button" onClick={later} className="h-11 text-sm font-semibold text-muted hover:text-foreground">
              {state === "ask" || state === "working" ? "Nanti saja" : "Tutup"}
            </button>
            <Link href="/member/notifikasi" onClick={later} className="self-center text-xs font-semibold text-accent hover:underline">
              Atur notifikasi
            </Link>
          </>
        )}
      </div>
    </Modal>
  );
}
