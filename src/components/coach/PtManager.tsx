"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface PtPackageSummary {
  id: string;
  name: string | null;
  coachName: string;
  mine: boolean;
  members: string[];
  sessionsDone: number;
  nextSession: number | null;
  /** The soonest scheduled session not trained yet. */
  nextSchedule: { number: number; today: boolean; label: string } | null;
}

interface MemberOption {
  id: string;
  name: string;
  inPt: boolean;
}

/** Finds members by part of their name; already-PT members can't be picked. */
export function MemberSearch({
  members,
  selected,
  onToggle,
  id,
}: {
  members: MemberOption[];
  selected: string[];
  onToggle: (memberId: string) => void;
  id: string;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [members, query]);
  return (
    <div className="flex flex-col gap-2">
      <Input id={id} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ketik nama member…" autoComplete="off" />
      {results.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {results.map((m) => {
            const on = selected.includes(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={m.inPt}
                  onClick={() => {
                    onToggle(m.id);
                    setQuery("");
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-muted">{m.inPt ? "sudah klien PT" : on ? "✓ dipilih" : "+ pilih"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {query.trim() && results.length === 0 && <p className="text-xs text-muted">Tidak ada member bernama &quot;{query.trim()}&quot;.</p>}
    </div>
  );
}

export function PtManager({ packages, members }: { packages: PtPackageSummary[]; members: MemberOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = packages.filter((p) => p.mine);
  const others = packages.filter((p) => !p.mine);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "";

  async function create() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/pt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: selected, name: name.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat paket PT.");
        return;
      }
      router.push(`/coach/pt/${data.package.id}`);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">+ Tambah klien PT</h2>
        <p className="text-sm text-muted">Pilih 1 member untuk PT sendiri, atau 2+ untuk couple/grup kecil yang latihan bareng.</p>
        <MemberSearch
          id="pt-member-search"
          members={members}
          selected={selected}
          onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
        />
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelected((s) => s.filter((x) => x !== id))}
                className="rounded-full bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent ring-1 ring-accent/30"
                aria-label={`Batal pilih ${nameOf(id)}`}
              >
                {nameOf(id)} ✕
              </button>
            ))}
          </div>
        )}
        {selected.length > 1 && (
          <label className="text-sm font-medium" htmlFor="pt-package-name">
            Nama paket (opsional)
            <Input id="pt-package-name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Couple Rina & Budi" />
          </label>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="button" onClick={create} disabled={selected.length === 0 || pending} className="self-start">
          {pending ? "Membuat…" : selected.length > 1 ? `Buat paket couple (${selected.length} orang)` : "Buat paket PT"}
        </Button>
      </Card>

      <PackageList title="Klien PT kamu" packages={mine} empty="Belum ada klien PT. Tambahkan di atas." />
      {others.length > 0 && <PackageList title="Klien PT coach lain" packages={others} empty="" />}
    </div>
  );
}

function PackageList({ title, packages, empty }: { title: string; packages: PtPackageSummary[]; empty: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {packages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-5 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {packages.map((p) => (
            <li key={p.id}>
              <Link href={`/coach/pt/${p.id}`} className="flex h-full flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-card hover:border-accent">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{p.name || p.members.join(" & ")}</span>
                  {p.members.length > 1 && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-xs font-bold uppercase text-accent">Couple</span>}
                </span>
                {p.name && <span className="text-sm text-muted">{p.members.join(", ")}</span>}
                <span className="text-sm text-muted">
                  {p.mine ? "" : `${p.coachName} · `}
                  {p.sessionsDone} sesi selesai · {p.nextSession ? `berikutnya Sesi ${p.nextSession}` : "sesi berikutnya belum ditulis"}
                </span>
                {p.nextSchedule && (
                  <span className={`text-sm font-semibold ${p.nextSchedule.today ? "text-accent" : "text-foreground/80"}`}>
                    📅 Sesi {p.nextSchedule.number} · {p.nextSchedule.today ? `hari ini${p.nextSchedule.label.includes("· ") ? ` · ${p.nextSchedule.label.split("· ")[1]}` : ""}` : p.nextSchedule.label}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
