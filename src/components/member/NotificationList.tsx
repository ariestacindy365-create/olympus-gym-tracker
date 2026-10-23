"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface NotificationRow {
  id: string;
  type: "KUDOS" | "COMMENT" | "COACH_NOTE" | "PROGRAM_TODAY" | "ANNOUNCEMENT";
  title: string;
  body: string;
  url: string | null;
  announcementId: string | null;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** The member's notifications; opening the page marks them all read. */
export function NotificationList({ items }: { items: NotificationRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (items.some((n) => !n.read)) void fetch("/api/notifications/read", { method: "POST" });
    // An announcement link (#n-<id>) opens that one.
    const hash = window.location.hash.replace("#n-", "");
    if (hash) queueMicrotask(() => setOpen(hash));
  }, [items]);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-muted">
        Belum ada notifikasi. Kabar 💪, komentar, catatan coach, dan pengumuman akan muncul di sini.
      </p>
    );
  }

  return (
    <ul className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {items.map((n) => {
        const isAnnouncement = n.type === "ANNOUNCEMENT";
        const expanded = isAnnouncement && open === n.announcementId;
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className={`text-sm leading-snug ${n.read ? "font-semibold" : "font-bold"}`}>{n.title}</p>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Belum dibaca" />}
            </div>
            <p className={`mt-0.5 text-[13px] text-muted ${expanded ? "whitespace-pre-line" : "line-clamp-2"}`}>{n.body}</p>
            <p className="mt-1 text-[11px] text-muted">{timeAgo(n.createdAt)}</p>
          </>
        );
        return (
          <li
            key={n.id}
            id={n.announcementId ? `n-${n.announcementId}` : undefined}
            className={`scroll-mt-20 border-b border-border last:border-0 ${n.read ? "" : "bg-accent/5"}`}
          >
            {isAnnouncement ? (
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : n.announcementId)}
                  aria-expanded={expanded}
                  className="block w-full text-left"
                >
                  {content}
                </button>
                {expanded && n.linkUrl && /^https?:\/\//i.test(n.linkUrl) && (
                  <a
                    href={n.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex h-9 items-center rounded-lg bg-accent px-3 text-sm font-semibold text-white"
                  >
                    Buka link ↗
                  </a>
                )}
              </div>
            ) : (
              <Link href={n.url ?? "/member/dashboard"} className="block px-4 py-3 transition hover:bg-surface-2">
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
