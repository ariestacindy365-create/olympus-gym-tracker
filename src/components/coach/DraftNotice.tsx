"use client";
import { useConfirm } from "@/components/ui/ConfirmProvider";
export function DraftNotice({ status, dirty, onDownload, onDiscard }: { status: string; dirty: boolean; onDownload: () => void; onDiscard: () => void }) {
  const confirm = useConfirm();
  return <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm" role="status"><p>{status}</p>{dirty && <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={onDownload} className="min-h-11 rounded-lg px-3 font-semibold text-accent">Unduh draft</button><button type="button" onClick={async () => { if (await confirm({ description: "Buang draft lokal dan muat versi server? Unduh draft lebih dulu jika ingin menyimpan cadangan.", confirmLabel: "Buang draft & muat server", danger: true, autoFocusConfirm: false })) onDiscard(); }} className="min-h-11 rounded-lg px-3 text-danger">Muat versi server</button></div>}</div>;
}
