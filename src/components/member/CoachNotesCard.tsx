"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatNoteDate, type CoachNoteItem } from "@/lib/coachNoteFormat";

const PREVIEW = 3;

/** Member side: latest feedback from coaches; marks it read once shown. */
export function CoachNotesCard({ notes }: { notes: CoachNoteItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const hasUnread = notes.some((n) => !n.readAt);

  useEffect(() => {
    if (hasUnread) void fetch("/api/member/coach-notes/read", { method: "POST" }).catch(() => {});
  }, [hasUnread]);

  if (notes.length === 0) return null;
  const visible = showAll ? notes : notes.slice(0, PREVIEW);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">💬 Catatan dari Coach</h2>
        {hasUnread && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
            {notes.filter((n) => !n.readAt).length} baru
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {visible.map((n) => (
          <li
            key={n.id}
            className={`rounded-lg px-3 py-2.5 text-sm ${n.readAt ? "bg-surface-2" : "bg-accent/10 ring-1 ring-accent/30"}`}
          >
            <p className="text-xs text-muted">
              <span className="font-semibold text-foreground">{n.coachName}</span>
              {n.context && ` · ${n.context}`} · {formatNoteDate(n.createdAt)}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
          </li>
        ))}
      </ul>
      {notes.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start text-xs font-semibold text-accent hover:underline"
        >
          {showAll ? "Tampilkan lebih sedikit" : `Lihat semua (${notes.length})`}
        </button>
      )}
    </Card>
  );
}
