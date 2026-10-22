"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

const POPPED_KEY = "olympus-notif-popped";
const POLL_MS = 60_000;
const POPUP_MS = 8_000;
// Older unread ones show in the list but don't pop up.
const POPUP_MAX_AGE_MS = 3 * 24 * 3600_000;

function readPopped(): string {
  try {
    return localStorage.getItem(POPPED_KEY) ?? "";
  } catch {
    return "";
  }
}
function writePopped(v: string) {
  try {
    localStorage.setItem(POPPED_KEY, v);
  } catch {
    // Private mode: the popup may repeat once per visit, which is fine.
  }
}

/**
 * 🔔 with the unread count, plus a popup for the newest unread notification
 * the member hasn't seen pop up yet (checked on open, every minute and when
 * the app comes back to the foreground).
 */
export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [popup, setPopup] = useState<Item | null>(null);
  const [more, setMore] = useState(0);
  const popped = useRef<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const data: { unread: number; latest: Item[] } = await res.json();
    setUnread(data.unread);
    popped.current ??= readPopped();
    const fresh = data.latest.filter(
      (n) => !n.readAt && n.createdAt > popped.current! && Date.now() - new Date(n.createdAt).getTime() < POPUP_MAX_AGE_MS
    );
    // On the notifications page itself the list already shows them.
    if (fresh.length > 0 && !window.location.pathname.startsWith("/member/notifikasi")) {
      popped.current = data.latest[0].createdAt;
      writePopped(popped.current);
      setPopup(fresh[0]);
      setMore(fresh.length - 1);
    }
  }, []);

  useEffect(() => {
    // Poll from a timer callback so state updates don't run during the effect itself.
    const first = setTimeout(load, 0);
    const timer = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setPopup(null), POPUP_MS);
    return () => clearTimeout(t);
  }, [popup]);

  function open(n: Item) {
    setPopup(null);
    setUnread((u) => Math.max(0, u - 1));
    void fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [n.id] }),
    });
    router.push(n.url ?? "/member/notifikasi");
  }

  return (
    <>
      <Link
        href="/member/notifikasi"
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-nav-foreground/90 transition hover:bg-white/10"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-nav-bg">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>

      {popup && (
        <div
          role="status"
          className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+4.25rem)] z-50 mx-auto max-w-sm animate-pop-in sm:left-auto sm:right-4 sm:mx-0"
        >
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 text-foreground shadow-overlay">
            <button type="button" onClick={() => open(popup)} className="min-w-0 flex-1 text-left">
              <p className="text-sm font-bold leading-snug">{popup.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{popup.body}</p>
              <p className="mt-1.5 text-xs font-semibold text-accent">Lihat →</p>
            </button>
            <button
              type="button"
              onClick={() => setPopup(null)}
              aria-label="Tutup notifikasi"
              className="-mr-1 -mt-1 h-7 w-7 shrink-0 rounded-full text-lg leading-none text-muted hover:bg-surface-2 hover:text-foreground"
            >
              ×
            </button>
          </div>
          {more > 0 && (
            <Link
              href="/member/notifikasi"
              onClick={() => setPopup(null)}
              className="mt-1.5 block rounded-xl border border-border bg-surface px-3.5 py-2 text-center text-xs font-semibold text-muted shadow-raised hover:text-foreground"
            >
              dan {more} notifikasi lainnya
            </Link>
          )}
        </div>
      )}
    </>
  );
}
