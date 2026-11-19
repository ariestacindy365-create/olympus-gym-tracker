"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EXPORT_SECTIONS, EXPORT_SECTION_LABEL, exportFileName, type ExportSection } from "@/lib/exportRules";

const DETAIL: Record<ExportSection, string> = {
  member: "Tab Member (nama, email, WA, tanggal lahir, paket aktif) dan tab Paket (kredit, sisa, masa berlaku, sumber).",
  keuangan: "Tab Ringkasan, Pembayaran paket, Kasir, dan Pengeluaran dalam periode.",
  lead: "Tab Lead (semua lead dan statusnya) dan tab Booking kelas dalam periode.",
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Pick the data and the period, then download one Excel file. */
export function ExportForm({ today }: { today: string }) {
  const [y, m] = today.split("-").map(Number);
  const ranges: { label: string; from: string; to: string }[] = [
    { label: "Bulan ini", from: ymd(y, m, 1), to: today },
    { label: "Bulan lalu", from: m === 1 ? ymd(y - 1, 12, 1) : ymd(y, m - 1, 1), to: m === 1 ? ymd(y - 1, 12, 31) : ymd(y, m - 1, lastDay(y, m - 1)) },
    { label: "3 bulan", from: m > 2 ? ymd(y, m - 2, 1) : ymd(y - 1, m + 10, 1), to: today },
    { label: "Tahun ini", from: ymd(y, 1, 1), to: today },
  ];
  const [sections, setSections] = useState<ExportSection[]>([...EXPORT_SECTIONS]);
  const [from, setFrom] = useState(ranges[0].from);
  const [to, setTo] = useState(ranges[0].to);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (s: ExportSection) => setSections((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  async function download() {
    setError(null);
    if (sections.length === 0) return setError("Pilih data yang mau diekspor.");
    if (!from || !to || from > to) return setError("Tanggal awal harus sebelum tanggal akhir.");
    setPending(true);
    try {
      const qs = new URLSearchParams({ bagian: sections.join(","), dari: from, sampai: to });
      const res = await fetch(`/api/export?${qs}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return setError(data.error ?? "Gagal membuat file. Coba lagi.");
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName(from, to);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("Tidak ada koneksi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-bold">Data</h2>
        {EXPORT_SECTIONS.map((s) => (
          <label key={s} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
            <input type="checkbox" checked={sections.includes(s)} onChange={() => toggle(s)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
            <span>
              <span className="block font-semibold">{EXPORT_SECTION_LABEL[s]}</span>
              <span className="block text-xs text-muted">{DETAIL[s]}</span>
            </span>
          </label>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-bold">Periode</h2>
        <p className="text-xs text-muted">Untuk keuangan dan booking kelas. Member, paket, dan lead selalu diekspor lengkap.</p>
        <div className="flex flex-wrap gap-2">
          {ranges.map((r) => {
            const on = r.from === from && r.to === to;
            return (
              <button
                key={r.label}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFrom(r.from);
                  setTo(r.to);
                }}
                className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${on ? "border-accent bg-accent text-white" : "border-border bg-surface"}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Dari
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Sampai
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" disabled={pending} onClick={download} className="h-12">
        {pending ? "Menyiapkan file…" : "⬇️ Unduh Excel"}
      </Button>
      <p className="text-xs text-muted">File berisi data pribadi member dan keuangan. Simpan baik-baik dan jangan disebar.</p>
    </div>
  );
}
