"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/Icons";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { formatNoteDate, type CoachNoteItem } from "@/lib/coachNoteFormat";

interface CoachNotesPanelProps {
  memberId: string;
  memberName: string;
  /** "What is this about" options, e.g. "Back Squat · 12 Okt" (most recent first). */
  contexts: string[];
  initialNotes: CoachNoteItem[];
}

/** Coach side of the feedback thread: write a note, see whether it was read. */
export function CoachNotesPanel({ memberId, memberName, contexts, initialNotes }: CoachNotesPanelProps) {
  const confirmDialog = useConfirm();
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [context, setContext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/coach/members/${memberId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, context: context || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim catatan.");
        return;
      }
      setNotes((prev) => [data.note, ...prev]);
      setBody("");
      setContext("");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog({ description: "Hapus catatan ini?", confirmLabel: "Hapus", danger: true }))) return;
    const res = await fetch(`/api/coach/members/${memberId}/notes/${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
    else setError("Gagal menghapus catatan.");
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Catatan Coach</h2>
        <p className="text-xs text-muted">Feedback untuk {memberName}. Muncul di beranda member.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Select value={context} onChange={(e) => setContext(e.target.value)} aria-label="Tentang">
          <option value="">Umum</option>
          {contexts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="mis. Squat makin dalam, pertahankan! Minggu depan coba naik 2,5 kg."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-card placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={pending || !body.trim()} className="self-end">
          {pending ? "Mengirim..." : "Kirim Catatan"}
        </Button>
      </form>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    {n.context ?? "Umum"} · {n.coachName} · {formatNoteDate(n.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                  <p className={`mt-1 text-xs font-medium ${n.readAt ? "text-success" : "text-muted"}`}>
                    {n.readAt ? "✓ Dibaca" : "Belum dibaca"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(n.id)}
                  aria-label="Hapus catatan"
                  className="rounded-md p-1.5 text-muted transition hover:text-danger"
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
