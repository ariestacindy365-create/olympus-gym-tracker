"use client";

import { useState } from "react";
import Link from "next/link";
import { formatKg } from "@/lib/volumeStory";
import type { RecapClass, RecapMember } from "@/lib/classRecap";

function ClassCard({ klass }: { klass: RecapClass }) {
  const [members, setMembers] = useState<RecapMember[]>(klass.members);
  const [note, setNote] = useState("");
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const prs = members.reduce((a, m) => a + m.prs, 0);
  const cheerable = members.filter((m) => m.workoutId && !m.kudoed);

  async function cheer(list: RecapMember[]) {
    setBusy(true);
    setMsg(null);
    const ok = new Set<string>();
    await Promise.all(
      list.map(async (m) => {
        const res = await fetch(`/api/member/workouts/${m.workoutId}/kudos`, { method: "POST" }).catch(() => null);
        if (res?.ok) ok.add(m.id);
      })
    );
    setMembers((prev) => prev.map((m) => (ok.has(m.id) ? { ...m, kudoed: true } : m)));
    if (ok.size < list.length) setMsg("Sebagian 💪 gagal terkirim. Coba lagi.");
    setBusy(false);
  }

  async function sendNote() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/coach/class-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds: members.map((m) => m.id), body: note, context: `Kelas ${klass.time}` }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      setMsg(`✓ Catatan terkirim ke ${data.sent} member.`);
      setNote("");
      setWriting(false);
    } else setMsg(data?.error ?? "Gagal mengirim catatan.");
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-lg font-bold">Kelas {klass.time}</p>
        <p className="text-xs text-muted">
          {members.length} member{prs > 0 && ` · 🏆 ${prs} rekor`}
        </p>
      </div>
      {members.length === 0 ? (
        <p className="mt-1 text-sm text-muted">{klass.started ? "Belum ada yang mencatat latihan di kelas ini." : "Kelas belum mulai."}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
              <Link href={`/coach/members/${m.id}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate font-medium">{m.name}</span>
                <span className="text-xs text-muted">
                  {m.sets} set · {formatKg(m.volume)} kg{m.prs > 0 && ` · 🏆 ${m.prs}`}
                  {!m.workoutId && " · belum disimpan"}
                </span>
              </Link>
              {m.workoutId && (
                <button
                  type="button"
                  onClick={() => cheer([m])}
                  disabled={busy || m.kudoed}
                  aria-label={`Semangati ${m.name}`}
                  className={`h-9 shrink-0 rounded-lg px-2.5 text-sm font-semibold ${m.kudoed ? "bg-accent/10 text-accent" : "border border-border hover:bg-surface-2"}`}
                >
                  💪{m.kudoed ? " ✓" : ""}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {members.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {cheerable.length > 1 && (
            <button
              type="button"
              onClick={() => cheer(cheerable)}
              disabled={busy}
              className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-2 disabled:opacity-60"
            >
              💪 Semangati semua ({cheerable.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setWriting((w) => !w)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2"
          >
            📝 Catatan untuk kelas ini
          </button>
        </div>
      )}
      {writing && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="mis. Kerja bagus hari ini! Besok jangan lupa pemanasan bahu ya."
            aria-label={`Catatan untuk kelas ${klass.time}`}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={sendNote}
            disabled={busy || !note.trim()}
            className="h-9 self-end rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            Kirim ke {members.length} member
          </button>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}

/** "Rekap kelas hari ini": who trained in each of the coach's classes, with 💪 and a note for all. */
export function ClassRecap({ classes }: { classes: RecapClass[] }) {
  return (
    <div className="flex flex-col gap-3">
      {classes.map((c) => (
        <ClassCard key={c.sessionId} klass={c} />
      ))}
    </div>
  );
}
