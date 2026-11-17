"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  members: number;
  membersNew: number;
  withAccount: number;
  memberships: number;
  membershipsNew: number;
  bookable: number;
  skipped: { noPackage: number; ended: number; badDates: number };
}

/** Pick the CSV → see what it contains → Impor. Re-importing a newer file updates instead of duplicating. */
export function FitQuarterImport() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Result | null>(null);
  const [done, setDone] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(f: File, mode: "preview" | "import") {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("file", f);
    form.set("mode", mode);
    const res = await fetch("/api/fitquarter/import", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setPending(false);
    if (!res?.ok) {
      setError(data?.error ?? "Gagal membaca file. Coba lagi.");
      return null;
    }
    return data.result as Result;
  }

  async function pick(f: File | undefined) {
    setDone(null);
    setPreview(null);
    if (!f) return;
    setFile(f);
    setPreview(await send(f, "preview"));
  }

  async function doImport() {
    if (!file) return;
    const r = await send(file, "import");
    if (r) {
      setDone(r);
      setPreview(null);
      router.refresh();
    }
  }

  const row = (label: string, value: string | number, hint?: string) => (
    <li className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-sm">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className="font-display text-lg font-bold tabular-nums">{value}</span>
    </li>
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>Di FitQuarter buka Member List, lalu Export ke CSV.</li>
        <li>Pilih file itu di sini, cek ringkasannya, lalu tekan Impor.</li>
        <li>Impor lagi file yang lebih baru kapan saja: data yang sama diperbarui, tidak dobel.</li>
      </ol>
      <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} aria-label="Pilih file CSV FitQuarter" />
      <button
        type="button"
        onClick={() => {
          if (input.current) {
            input.current.value = "";
            input.current.click();
          }
        }}
        disabled={pending}
        className="h-12 rounded-xl border border-dashed border-border-strong font-semibold text-accent disabled:opacity-60"
      >
        {file ? `📄 ${file.name}` : "Pilih file CSV"}
      </button>
      {pending && <p className="text-sm text-muted">Membaca file…</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {(preview || done) && (
        <div>
          <p className="text-sm font-semibold">{done ? "✓ Impor selesai" : "Isi file ini"}</p>
          <ul className="divide-y divide-border">
            {row("Member", (preview ?? done)!.members, `${(preview ?? done)!.membersNew} baru`)}
            {row("Sudah punya akun di aplikasi", (preview ?? done)!.withAccount, "Email sama, membership langsung tertaut")}
            {row("Membership yang masih berlaku", (preview ?? done)!.memberships, `${(preview ?? done)!.membershipsNew} baru · ${(preview ?? done)!.bookable} bisa booking kelas`)}
            {row("Baris dilewati", (preview ?? done)!.skipped.ended + (preview ?? done)!.skipped.noPackage + (preview ?? done)!.skipped.badDates, `${(preview ?? done)!.skipped.ended} sudah berakhir · ${(preview ?? done)!.skipped.noPackage} tanpa paket`)}
          </ul>
          {preview && (
            <button type="button" onClick={doImport} disabled={pending} className="mt-3 h-12 w-full rounded-xl bg-accent font-bold text-white hover:bg-accent-2 disabled:opacity-60">
              {pending ? "Mengimpor…" : `Impor ${preview.members} member & ${preview.memberships} membership`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
