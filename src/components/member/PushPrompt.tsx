"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { currentSubscription, enablePush, pushSupport } from "@/lib/pushClient";

const SNOOZE_KEY = "olympus-push-prompt-until";
const SNOOZE_DAYS = 7;

type State = "hidden" | "ask" | "ios" | "working" | "done" | "denied";

function snoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/** Dashboard nudge to turn on phone notifications, until they're on or snoozed for a week. */
export function PushPrompt() {
  const [state, setState] = useState<State>("hidden");

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
    const t = setTimeout(() => setState("hidden"), 3000);
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
    <section className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4" aria-label="Nyalakan notifikasi">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-lg text-white" aria-hidden>
        🔔
      </span>
      <div className="min-w-0 flex-1">
        {state === "done" ? (
          <p className="font-semibold">✓ Notifikasi aktif di HP ini</p>
        ) : (
          <>
            <p className="font-semibold">Nyalakan notifikasi</p>
            <p className="text-sm text-muted">
              {state === "ios"
                ? "Di iPhone: buka di Safari, tekan Bagikan → \"Tambah ke Layar Utama\", lalu buka Olympus dari layar utama untuk mengaktifkan notifikasi."
                : state === "denied"
                  ? "Notifikasi diblokir browser. Izinkan lewat pengaturan situs (ikon gembok di kolom alamat), lalu muat ulang."
                  : "Dapat kabar 💪 dan komentar, catatan coach, program pagi, dan pengingat catat latihan, walau aplikasi ditutup."}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {(state === "ask" || state === "working") && (
                <button
                  type="button"
                  onClick={enable}
                  disabled={state === "working"}
                  className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-2 disabled:opacity-60"
                >
                  {state === "working" ? "Mengaktifkan…" : "Nyalakan"}
                </button>
              )}
              <button type="button" onClick={later} className="h-9 rounded-lg px-3 text-sm font-semibold text-muted hover:text-foreground">
                Nanti saja
              </button>
              <Link href="/member/notifikasi" className="text-xs font-semibold text-accent hover:underline">
                Atur notifikasi
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
