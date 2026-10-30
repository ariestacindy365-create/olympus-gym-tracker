"use client";

import { useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { TrashIcon } from "@/components/ui/Icons";

/**
 * The delete waits out a short grace period so it can be undone. Leaving
 * before it ends (another page, another movement, the phone switching apps)
 * deletes right away rather than silently keeping the set.
 */
export function UndoDeleteButton({ label, disabled, onDelete }: {
  label: string;
  disabled?: boolean;
  onDelete: () => Promise<void>;
}) {
  const confirm = useConfirm();
  const [waiting, setWaiting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDeleteRef = useRef(onDelete);
  useEffect(() => { onDeleteRef.current = onDelete; });
  // Runs the pending delete now, once.
  const flush = useRef(() => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    void onDeleteRef.current().catch(() => {});
  });
  useEffect(() => {
    const run = flush.current;
    const onHide = () => { if (document.visibilityState === "hidden") run(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", run);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", run);
      run();
    };
  }, []);
  async function schedule() {
    if (!(await confirm({ title: "Hapus 1 set", description: `${label}. Hanya 1 set ini yang terdampak. Kamu bisa membatalkan selama 8 detik sebelum set dihapus.`, confirmLabel: "Hapus 1 set", danger: true, autoFocusConfirm: false }))) return;
    setWaiting(true);
    timer.current = setTimeout(async () => {
      timer.current = null;
      setWaiting(false); setDeleting(true);
      try { await onDelete(); } finally { setDeleting(false); }
    }, 8000);
  }
  if (waiting) return <span className="inline-flex flex-wrap items-center gap-2 text-xs" role="status"><span>1 set akan dihapus</span><button type="button" onClick={() => { if (timer.current) clearTimeout(timer.current); timer.current = null; setWaiting(false); }} className="min-h-11 cursor-pointer rounded-lg px-3 font-semibold text-accent">Batalkan</button></span>;
  return <button type="button" disabled={disabled || deleting} onClick={schedule} aria-label={`Hapus 1 set: ${label}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-danger hover:bg-danger/10 disabled:opacity-50">{deleting ? "Menghapus…" : <TrashIcon />}</button>;
}
