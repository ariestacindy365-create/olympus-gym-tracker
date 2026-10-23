"use client";

import { useState } from "react";
import { MuscleMap } from "@/components/shared/MuscleMap";
import { WorkoutStickerModal } from "@/components/shared/WorkoutStickerModal";
import { formatKg } from "@/lib/volumeStory";
import { formatDuration } from "@/lib/duration";
import type { FeedPost } from "@/lib/feed";

interface Comment {
  id: string;
  body: string;
  name: string;
  coach: boolean;
  createdAt: string;
}

const VISIBILITY_NOTE = { ALL: "", COACH: "🔒 Hanya pelatih", PRIVATE: "🔒 Hanya kamu" } as const;

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

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function PostCard({ post }: { post: FeedPost }) {
  const [kudos, setKudos] = useState({ count: post.kudos, mine: post.kudoed });
  const [commentCount, setCommentCount] = useState(post.comments);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allLines, setAllLines] = useState(false);
  const [sticker, setSticker] = useState(false);

  async function toggleKudos() {
    const next = !kudos.mine;
    setKudos((k) => ({ count: k.count + (next ? 1 : -1), mine: next }));
    const res = await fetch(`/api/member/workouts/${post.id}/kudos`, { method: next ? "POST" : "DELETE" }).catch(() => null);
    if (res?.ok) setKudos(await res.json());
    else setKudos((k) => ({ count: k.count + (next ? -1 : 1), mine: !next }));
  }

  async function toggleComments() {
    setOpen((o) => !o);
    if (comments === null) {
      const res = await fetch(`/api/member/workouts/${post.id}/comments`).catch(() => null);
      setComments(res?.ok ? (await res.json()).comments : []);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/workouts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim komentar.");
      setComments((c) => [...(c ?? []), data.comment]);
      setCommentCount((n) => n + 1);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim komentar.");
    } finally {
      setPending(false);
    }
  }

  const lines = post.summary.lines;
  return (
    <article id={`post-${post.id}`} className="scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-3 px-4 pt-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nav-bg font-display text-sm font-bold text-white">
          {initials(post.memberName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {post.memberName}
            {post.mine && <span className="ml-1 text-xs font-normal text-muted">(kamu)</span>}
          </p>
          <p className="text-xs text-muted">
            {post.backfilledDate
              ? `Latihan ${new Date(`${post.backfilledDate}T00:00:00Z`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}`
              : timeAgo(post.createdAt)}
            {post.classLabel && ` · Kelas ${post.classLabel}`}
            {VISIBILITY_NOTE[post.visibility] && ` · ${VISIBILITY_NOTE[post.visibility]}`}
          </p>
        </div>
      </div>
      <div className="px-4 pt-2">
        <h3 className="font-display text-lg font-bold uppercase tracking-wide">{post.title}</h3>
        {post.note && <p className="mt-0.5 whitespace-pre-line text-sm text-foreground/85">{post.note}</p>}
        <dl className="mt-2 flex gap-5 text-sm">
          <div>
            <dt className="text-[11px] text-muted">Durasi</dt>
            <dd className="font-semibold">{formatDuration(post.durationSec)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">Volume</dt>
            <dd className="font-semibold">{formatKg(post.totalVolume)} kg</dd>
          </div>
          {post.prCount > 0 && (
            <div>
              <dt className="text-[11px] text-muted">Rekor</dt>
              <dd className="font-semibold">🏆 {post.prCount}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
        <MuscleMap levels={post.summary.levels} height={84} labels={false} />
        <ul className="min-w-0 flex-1 text-[13px]">
          {(allLines ? lines : lines.slice(0, 5)).map((l) => (
            <li key={l.exercise} className="truncate">
              <span className="font-semibold">{l.sets} set</span> {l.exercise}
              {l.pr && " 🏆"}
            </li>
          ))}
          {lines.length > 5 && (
            <li>
              <button
                type="button"
                onClick={() => setAllLines((v) => !v)}
                aria-expanded={allLines}
                className="text-xs font-semibold text-accent hover:underline"
              >
                {allLines ? "Sembunyikan" : `+${lines.length - 5} gerakan lagi`}
              </button>
            </li>
          )}
        </ul>
      </div>
      <div className="mt-2 flex border-t border-border">
        <button
          type="button"
          onClick={toggleKudos}
          aria-pressed={kudos.mine}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition ${
            kudos.mine ? "text-accent" : "text-muted hover:text-foreground"
          }`}
        >
          <span className={kudos.mine ? "" : "grayscale"}>💪</span> {kudos.count > 0 ? kudos.count : "Semangat"}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          aria-expanded={open}
          className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          💬 {commentCount > 0 ? commentCount : "Komentar"}
        </button>
        {post.mine && (
          <button
            type="button"
            onClick={() => setSticker(true)}
            className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2.5 text-sm font-semibold text-muted hover:text-foreground"
          >
            🖼️ Stiker
          </button>
        )}
      </div>
      {sticker && (
        <WorkoutStickerModal
          title={post.title}
          lines={post.summary.lines}
          levels={post.summary.levels}
          stats={`${formatKg(post.totalVolume)} kg · ${post.summary.lines.reduce((a, l) => a + l.sets, 0)} set${post.prCount ? ` · ${post.prCount} PR` : ""}`}
          memberName={post.memberName}
          onClose={() => setSticker(false)}
        />
      )}
      {open && (
        <div className="border-t border-border bg-surface-2/60 px-4 py-3">
          {comments === null ? (
            <p className="text-xs text-muted">Memuat…</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-semibold">{c.name}</span>
                  {c.coach && (
                    <span className="ml-1 rounded bg-accent/10 px-1 py-px text-[10px] font-bold uppercase text-accent">Coach</span>
                  )}{" "}
                  {c.body}
                  <span className="ml-1 text-[11px] text-muted">{timeAgo(c.createdAt)}</span>
                </li>
              ))}
              {comments.length === 0 && <li className="text-xs text-muted">Belum ada komentar. Jadi yang pertama!</li>}
            </ul>
          )}
          <form onSubmit={send} className="mt-2.5 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={300}
              placeholder="Tulis komentar…"
              aria-label="Tulis komentar"
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Kirim
            </button>
          </form>
          {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        </div>
      )}
    </article>
  );
}

export function FeedView({ posts, emptyText }: { posts: FeedPost[]; emptyText?: string }) {
  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-muted">
        {emptyText ?? (
          <>
            Belum ada latihan di Feed. Selesaikan latihan hari ini lalu tekan <b>Simpan latihan</b> — latihanmu akan muncul di
            sini.
          </>
        )}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
