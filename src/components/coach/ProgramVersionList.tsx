"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import type { SnapshotData } from "@/lib/programSave";

export interface ProgramVersion {
  id: string;
  weekNumber: number;
  savedAt: string;
  /** Newest version of its Minggu, i.e. what's live now. */
  current: boolean;
  data: SnapshotData;
}

const WEEKS = [1, 2, 3, 4];
const PAGE = 15;

function formatSavedAt(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Every saved version of the coach's program; any of them can be put back into Minggu 1-4. */
export function ProgramVersionList({ versions }: { versions: ProgramVersion[] }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const toast = useToast();
  const [week, setWeek] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const list = versions.filter((v) => week === null || v.weekNumber === week);

  async function reuse(v: ProgramVersion, target: number) {
    const ok = await confirmDialog({
      title: `Pakai di Minggu ${target}?`,
      description: `Isi Minggu ${target} sekarang akan diganti dengan versi Minggu ${v.weekNumber} yang disimpan ${formatSavedAt(v.savedAt)}. Isi yang sekarang tetap ada di daftar ini, jadi bisa dikembalikan.`,
      confirmLabel: `Ganti Minggu ${target}`,
      danger: true,
    });
    if (!ok) return;
    setPending(`${v.id}:${target}`);
    try {
      const res = await fetch(`/api/coach/programs/snapshots/${v.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal memakai versi ini.");
      toast.success(`Minggu ${target} sekarang memakai versi ini.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memakai versi ini.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-xl font-bold">Pakai ulang program lama</h2>
        <p className="text-sm text-muted">
          Setiap kali kamu menekan Simpan, versinya tersimpan di sini. Pilih versi, lalu pakai di Minggu 1, 2, 3, atau 4.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter minggu">
        {[null, ...WEEKS].map((w) => (
          <button
            key={w ?? "all"}
            type="button"
            role="tab"
            aria-selected={week === w}
            onClick={() => {
              setWeek(w);
              setShown(PAGE);
            }}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
              week === w ? "bg-accent text-white" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {w === null ? "Semua" : `Minggu ${w}`}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
          Belum ada versi tersimpan{week ? ` untuk Minggu ${week}` : ""}. Versi muncul di sini setelah kamu menyimpan program.
        </p>
      )}

      {list.slice(0, shown).map((v) => {
        const days = v.data.days.filter((d) => d.slots.length > 0);
        const isOpen = open === v.id;
        return (
          <div key={v.id} className="rounded-xl border border-border bg-surface shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-3">
              <div>
                <p className="font-display text-lg font-bold">
                  Minggu {v.weekNumber}
                  {v.current && (
                    <span className="ml-2 rounded bg-success/10 px-1.5 py-0.5 align-middle font-sans text-[11px] font-bold uppercase text-success">
                      Dipakai sekarang
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">Disimpan {formatSavedAt(v.savedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : v.id)}
                aria-expanded={isOpen}
                className="text-sm font-semibold text-accent hover:underline"
              >
                {isOpen ? "Tutup" : "Lihat isi"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 pt-2">
              {days.map((d, i) => (
                <span key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                  <b>{d.dayLabel}</b>
                  {d.focusLabel ? ` · ${d.focusLabel}` : ""} · {d.slots.length} gerakan
                </span>
              ))}
            </div>
            {isOpen && (
              <div className="mx-4 mt-3 grid gap-3 rounded-lg bg-surface-2 p-3 text-sm sm:grid-cols-2">
                {days.map((d, i) => (
                  <div key={i}>
                    <p className="font-semibold">
                      {d.dayLabel}
                      {d.focusLabel ? ` · ${d.focusLabel}` : ""}
                    </p>
                    <ul className="mt-0.5 text-[13px] text-muted">
                      {d.slots.map((s, j) => (
                        <li key={j}>
                          {s.slotLabel && <b className="text-foreground">{s.slotLabel} </b>}
                          {s.movementName}
                          {s.repTarget ? ` · ${s.repTarget}` : ""}
                          {s.roundScheme ? ` · ${s.roundScheme}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 pt-3">
              <span className="text-sm text-muted">Pakai di:</span>
              {WEEKS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => reuse(v, w)}
                  disabled={pending !== null || (v.current && w === v.weekNumber)}
                  title={v.current && w === v.weekNumber ? "Versi ini sedang dipakai di minggu ini" : undefined}
                  className="h-8 rounded-lg border border-border bg-surface px-3 text-sm font-semibold hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  {pending === `${v.id}:${w}` ? "…" : `Minggu ${w}`}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {list.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="self-center text-sm font-semibold text-accent hover:underline">
          Tampilkan versi lebih lama
        </button>
      )}
    </section>
  );
}
