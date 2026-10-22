"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { ANNOUNCEMENT_CATEGORY, type AnnouncementCategoryKey } from "@/lib/announcements";

export interface SentAnnouncement {
  id: string;
  category: AnnouncementCategoryKey;
  title: string;
  body: string;
  linkUrl: string | null;
  author: string;
  mine: boolean;
  createdAt: string;
  recipients: number;
  read: number;
}

/** Staff: write an announcement / promo / article for every member, and see who read the past ones. */
export function AnnouncementManager({ sent, memberCount, canDeleteAll }: { sent: SentAnnouncement[]; memberCount: number; canDeleteAll: boolean }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const toast = useToast();
  const [category, setCategory] = useState<AnnouncementCategoryKey>("PENGUMUMAN");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ok = await confirmDialog({
      title: `Kirim ke ${memberCount} member?`,
      description: `"${title.trim()}" langsung muncul sebagai notifikasi di aplikasi dan di HP member yang mengaktifkan notifikasi.`,
      confirmLabel: "Kirim",
    });
    if (!ok) return;
    setPending(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, body, linkUrl: linkUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim.");
      toast.success(`Terkirim ke ${data.recipients} member.`);
      setTitle("");
      setBody("");
      setLinkUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim.");
    } finally {
      setPending(false);
    }
  }

  async function remove(a: SentAnnouncement) {
    const ok = await confirmDialog({
      title: "Tarik pengumuman ini?",
      description: `"${a.title}" akan hilang dari notifikasi semua member. Notifikasi yang sudah masuk ke HP tidak bisa ditarik.`,
      confirmLabel: "Tarik",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/announcements/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Pengumuman ditarik.");
      router.refresh();
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Gagal menarik pengumuman.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={send} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Jenis
            <Select value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategoryKey)}>
              {(Object.keys(ANNOUNCEMENT_CATEGORY) as AnnouncementCategoryKey[]).map((k) => (
                <option key={k} value={k}>
                  {ANNOUNCEMENT_CATEGORY[k].emoji} {ANNOUNCEMENT_CATEGORY[k].label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Judul
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="mis. Gym tutup Minggu, 2 November" required />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Isi
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={3000}
            rows={5}
            required
            placeholder="Tulis pengumuman, detail promo, atau isi artikel singkat…"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal shadow-card focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Link <span className="font-normal text-muted">(opsional: artikel lengkap, form promo, Instagram)</span>
          <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" inputMode="url" />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">Dikirim ke {memberCount} member.</p>
          <Button type="submit" disabled={pending || !title.trim() || !body.trim()}>
            {pending ? "Mengirim…" : "Kirim ke semua member"}
          </Button>
        </div>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">Sudah dikirim</h2>
        {sent.length === 0 && <p className="text-sm text-muted">Belum ada pengumuman.</p>}
        {sent.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-surface p-3.5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {ANNOUNCEMENT_CATEGORY[a.category].emoji} {ANNOUNCEMENT_CATEGORY[a.category].label}
                </p>
                <p className="font-semibold">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-muted">{a.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {a.author} · {new Date(a.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · dibaca {a.read}/{a.recipients}
                </p>
              </div>
              {(a.mine || canDeleteAll) && (
                <button type="button" onClick={() => remove(a)} className="shrink-0 text-xs font-semibold text-danger hover:underline">
                  Tarik
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
