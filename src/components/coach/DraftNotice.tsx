"use client";
import { useConfirm } from "@/components/ui/ConfirmProvider";

/**
 * Unsaved program edits. Normally a small orange line ("● Belum disimpan")
 * with a way to throw the edits away; the full message and a download button
 * only when the browser could not keep the draft.
 */
export function DraftNotice({ status, dirty, problem, what, onDownload, onDiscard }: { status: string; dirty: boolean; problem?: boolean; what?: string; onDownload: () => void; onDiscard: () => void }) {
  const confirm = useConfirm();
  const discard = async () => {
    if (await confirm({ description: "Buang perubahan yang belum disimpan dan kembali ke versi terakhir yang tersimpan?", confirmLabel: "Buang perubahan", danger: true, autoFocusConfirm: false })) onDiscard();
  };
  if (problem) {
    return <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm" role="status"><p>{status}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={onDownload} className="min-h-11 rounded-lg px-3 font-semibold text-accent">Unduh draft</button>{dirty && <button type="button" onClick={discard} className="min-h-11 rounded-lg px-3 text-danger">Muat versi server</button>}</div></div>;
  }
  if (!dirty) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-warning" role="status" data-draft-unsaved>
      <span>● Belum disimpan{what ? `: ${what}` : ""}</span>
      <button type="button" onClick={discard} className="min-h-9 rounded-lg px-2 text-muted underline-offset-2 hover:text-foreground hover:underline">Batalkan perubahan</button>
    </p>
  );
}
