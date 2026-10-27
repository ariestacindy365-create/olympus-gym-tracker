"use client";

import { useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { TrashIcon } from "@/components/ui/Icons";

/** Nothing is deleted until the grace period ends; unmount cancels it. */
export function UndoDeleteButton({ label, disabled, onDelete }: {
  label: string;
  disabled?: boolean;
  onDelete: () => Promise<void>;
}) {
  const confirm = useConfirm();
  const [waiting, setWaiting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function schedule() {
    if (!(await confirm({ title: "Hapus 1 set", description: `${label}. Hanya 1 set ini yang terdampak. Kamu bisa membatalkan selama 8 detik sebelum set dihapus.`, confirmLabel: "Hapus 1 set", danger: true, autoFocusConfirm: false }))) return;
    setWaiting(true);
    timer.current = setTimeout(async () => {
      setWaiting(false); setDeleting(true);
      try { await onDelete(); } finally { setDeleting(false); }
    }, 8000);
  }
  if (waiting) return <span className="inline-flex flex-wrap items-center gap-2 text-xs" role="status"><span>1 set akan dihapus</span><button type="button" onClick={() => { if (timer.current) clearTimeout(timer.current); setWaiting(false); }} className="min-h-11 cursor-pointer rounded-lg px-3 font-semibold text-accent">Batalkan</button></span>;
  return <button type="button" disabled={disabled || deleting} onClick={schedule} aria-label={`Hapus 1 set: ${label}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-danger hover:bg-danger/10 disabled:opacity-50">{deleting ? "Menghapus…" : <TrashIcon />}</button>;
}
