"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ImportSummary {
  totalRows: number;
  groupsProcessed: number;
  setsCreated: number;
  setsUpdated: number;
  prsDetected: number;
  exercisesCreated: number;
  unmatchedMembers: { name: string; rowCount: number }[];
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-xl font-bold text-accent">{value}</p>
    </div>
  );
}

export function ImportProgressForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSummary(null);
    if (!file) {
      setError("Pilih file .xlsx dulu.");
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/coach/import-progress", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengimport data.");
        return;
      }
      setSummary(data);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              File Excel (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-background file:cursor-pointer"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={pending || !file} className="w-full sm:w-auto">
            {pending ? "Mengimport..." : "Import"}
          </Button>
        </form>
      </Card>

      {summary && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Hasil Import</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Baris dibaca" value={summary.totalRows} />
            <Stat label="Sesi diproses" value={summary.groupsProcessed} />
            <Stat label="Set baru" value={summary.setsCreated} />
            <Stat label="Set diupdate" value={summary.setsUpdated} />
            <Stat label="PR terdeteksi" value={summary.prsDetected} />
            <Stat label="Gerakan baru" value={summary.exercisesCreated} />
          </div>

          {summary.unmatchedMembers.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-danger">
                Member tidak ditemukan ({summary.unmatchedMembers.length})
              </h3>
              <p className="mb-2 text-xs text-muted">
                Nama-nama ini tidak cocok dengan member yang sudah terdaftar. Tambahkan dulu lewat halaman Members
                lalu import ulang kalau perlu.
              </p>
              <ul className="flex flex-col gap-1">
                {summary.unmatchedMembers.map((m) => (
                  <li key={m.name} className="flex justify-between text-sm">
                    <span>{m.name}</span>
                    <span className="text-muted">{m.rowCount} baris</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
