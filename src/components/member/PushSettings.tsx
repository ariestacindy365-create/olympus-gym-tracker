"use client";

import { useEffect, useState } from "react";
import { currentSubscription, disablePush, enablePush, pushSupport, type PushSupport } from "@/lib/pushClient";

type State = "loading" | "on" | "off" | "denied" | "error";

function Switch({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${on ? "bg-accent" : "bg-border-strong"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
    </button>
  );
}

/** "Notifikasi di HP" (this device's push) and the morning program reminder. */
export function PushSettings({ initialProgram }: { initialProgram: boolean }) {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [program, setProgram] = useState(initialProgram);

  useEffect(() => {
    // Browser-only checks, run once after mount.
    const s = pushSupport();
    queueMicrotask(() => setSupport(s));
    if (s !== "ok") return;
    if (Notification.permission === "denied") {
      queueMicrotask(() => setState("denied"));
      return;
    }
    currentSubscription().then((sub) => setState(sub ? "on" : "off"), () => setState("off"));
  }, []);

  async function togglePush() {
    setBusy(true);
    if (state === "on") {
      await disablePush();
      setState("off");
    } else {
      setState(await enablePush().then((r) => (r === "on" ? "on" : r)));
    }
    setBusy(false);
  }

  async function toggleProgram() {
    const next = !program;
    setProgram(next);
    const res = await fetch("/api/member/notify-program", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on: next }),
    }).catch(() => null);
    if (!res?.ok) setProgram(!next);
  }

  const pushHint =
    support === "ios-install"
      ? "Di iPhone: buka di Safari, tekan Bagikan → \"Tambah ke Layar Utama\", lalu buka Olympus dari layar utama dan aktifkan di sini."
      : support === "unsupported"
        ? "Browser ini belum mendukung notifikasi. Coba Chrome di Android atau aplikasi dari layar utama di iPhone."
        : state === "denied"
          ? "Notifikasi diblokir. Izinkan lewat pengaturan situs di browser (ikon gembok di kolom alamat), lalu muat ulang."
          : state === "error"
            ? "Gagal mengaktifkan. Coba lagi."
            : state === "on"
              ? "Aktif di perangkat ini. Notifikasi tetap muncul walau aplikasi ditutup."
              : "Dapat kabar 💪, komentar, catatan coach, dan pengumuman walau aplikasi ditutup.";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Notifikasi di HP</p>
          <p className={`text-xs ${state === "denied" || state === "error" ? "text-danger" : "text-muted"}`}>{pushHint}</p>
        </div>
        {support === "ok" && state !== "denied" && (
          <Switch on={state === "on"} onClick={togglePush} disabled={busy || state === "loading"} label="Notifikasi di HP" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <p className="text-sm font-semibold">Pengingat program pagi</p>
          <p className="text-xs text-muted">Setiap Senin–Sabtu sekitar jam 05.30–06.30: program kelas hari itu.</p>
        </div>
        <Switch on={program} onClick={toggleProgram} label="Pengingat program pagi" />
      </div>
    </div>
  );
}
