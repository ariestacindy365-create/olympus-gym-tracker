"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MuscleMap } from "@/components/shared/MuscleMap";
import { VolumeStoryModal } from "@/components/member/VolumeStoryModal";
import { WorkoutStickerModal } from "@/components/shared/WorkoutStickerModal";
import { formatKg, pickEquivalent, type LifterCharacter, type SkinTone } from "@/lib/volumeStory";
import { MUSCLE_LABEL, type MuscleKey } from "@/lib/muscles";
import type { DaySummary } from "@/lib/workoutSummary";
import { formatDuration } from "@/lib/duration";
import { estimateCalories } from "@/lib/calories";
import { formatAmount } from "@/lib/setUnits";

type Visibility = "ALL" | "COACH" | "PRIVATE";

const VISIBILITY: { value: Visibility; label: string; hint: string }[] = [
  { value: "ALL", label: "Semua member", hint: "Muncul di Feed Olympus" },
  { value: "COACH", label: "Hanya pelatih", hint: "Member lain tidak melihat" },
  { value: "PRIVATE", label: "Hanya saya", hint: "Tidak dibagikan" },
];

interface Totals {
  workoutNumber: number;
  durationSec: number;
  totalKg: number;
  daysThisWeek: number;
}

interface DayFinishFlowProps {
  title: string;
  memberName: string;
  storyCharacter: LifterCharacter | null;
  storySkinTone: SkinTone | null;
  defaultVisibility: Visibility;
  /** "Coach Ari · 09:00", saved with the workout. */
  classLabel: string | null;
  onClose: () => void;
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-2.5 text-center">
      <p className="font-display text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}

/**
 * "Selesai latihan hari ini": total volume + muscles worked → Simpan
 * (title, catatan, siapa yang bisa lihat) → "Kerja bagus!" cards to share.
 */
export function DayFinishFlow({
  title: defaultTitle,
  memberName,
  storyCharacter,
  storySkinTone,
  defaultVisibility,
  classLabel,
  onClose,
}: DayFinishFlowProps) {
  const [step, setStep] = useState<"summary" | "save" | "done">("summary");
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [pending, setPending] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [story, setStory] = useState(false);
  const [sticker, setSticker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/member/workouts/today")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.summary) return setError(d.error ?? "Gagal memuat ringkasan.");
        setSummary(d.summary);
        setBodyWeightKg(d.bodyWeightKg ?? null);
      })
      .catch(() => !cancelled && setError("Gagal memuat ringkasan."));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/member/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || defaultTitle,
          note: note.trim() || undefined,
          visibility,
          classLabel: classLabel ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan latihan.");
      setSummary(data.summary);
      setTotals(data.totals);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan latihan.");
    } finally {
      setPending(false);
    }
  }

  const firstName = memberName.split(" ")[0];
  const cal = summary ? estimateCalories(summary.durationSec, bodyWeightKg) : null;
  const eq = summary ? pickEquivalent(summary.totalVolume) : null;
  const muscles = summary
    ? (Object.entries(summary.muscleSets) as [MuscleKey, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : [];
  const shareText = summary
    ? `${title || defaultTitle} di OLYMPUS Lifting Club 💪 ${formatKg(summary.totalVolume)} kg total volume, ${summary.totalSets} set` +
      (summary.prCount ? `, ${summary.prCount} rekor pribadi 🏆` : "") +
      (eq ? ` — setara ${formatKg(eq.factor)}× ${eq.name} ${eq.emoji}` : "")
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-modal="true" aria-label="Selesai latihan">
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface shadow-overlay sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          {step === "save" ? (
            <button type="button" onClick={() => setStep("summary")} className="text-sm font-semibold text-accent">
              ‹ Kembali
            </button>
          ) : (
            <span className="w-14" />
          )}
          <p className="font-display text-base font-bold uppercase tracking-wide">
            {step === "summary" ? "Latihan selesai" : step === "save" ? "Simpan latihan" : "Tersimpan ✓"}
          </p>
          <button type="button" onClick={onClose} aria-label="Tutup" className="w-14 text-right text-xl text-muted hover:text-foreground">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!summary && !error && <p className="py-10 text-center text-sm text-muted">Menghitung volume…</p>}
          {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          {summary && step === "summary" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-nav-bg p-4 text-center text-white [background-image:radial-gradient(24rem_10rem_at_50%_0%,rgb(37_99_235/0.55),transparent)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-nav-muted">Total volume hari ini</p>
                <p className="mt-1 font-display text-5xl font-bold">
                  {formatKg(summary.totalVolume)}
                  <span className="ml-1 text-xl text-white/70">kg</span>
                </p>
                {eq && (
                  <p className="mt-1 text-sm text-white/80">
                    {eq.emoji} setara {formatKg(eq.factor)}× {eq.name}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Tile value={formatDuration(summary.durationSec)} label="Durasi" />
                <Tile value={String(summary.totalSets)} label="Set" />
                <Tile value={String(summary.lines.length)} label="Gerakan" />
                <Tile value={String(summary.prCount)} label="🏆 PR" />
              </div>
              {summary.durationSec >= 2 * 3600 && (
                <p className="-mt-2 text-center text-xs text-muted">⏱️ Durasi otomatis berhenti di 2 jam.</p>
              )}
              {cal && (
                <div className="flex items-center gap-3 rounded-2xl border border-[#f97316]/25 bg-[#f97316]/10 px-4 py-3">
                  <span className="text-3xl" aria-hidden>
                    🔥
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Kalori terbakar <span className="rounded bg-[#f97316]/20 px-1 text-[10px] text-[#ea580c]">Estimasi</span>
                    </p>
                    <p className="font-display text-2xl font-bold leading-tight">
                      ± {cal.kcal.toLocaleString("id-ID")} kcal
                      <span className="ml-1.5 font-sans text-xs font-normal text-muted">
                        ({cal.low.toLocaleString("id-ID")}–{cal.high.toLocaleString("id-ID")})
                      </span>
                    </p>
                    <p className="text-[11px] leading-snug text-muted">
                      Perkiraan dari {cal.minutes} menit latihan dan berat badan {cal.weightKg.toLocaleString("id-ID")} kg
                      {cal.defaultWeight ? " (rata-rata; isi Body Metrics supaya lebih pas)" : ""}. Bukan angka pasti.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-2xl bg-nav-bg p-3">
                <MuscleMap levels={summary.levels} height={112} tone="dark" />
                <div className="flex flex-wrap gap-1.5">
                  {muscles.map(([k, v]) => (
                    <span key={k} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/85">
                      {MUSCLE_LABEL[k]} · {formatKg(Math.round(v * 2) / 2)} set
                    </span>
                  ))}
                  {muscles.length === 0 && <span className="text-xs text-white/60">Otot belum dikenali untuk gerakan ini.</span>}
                </div>
              </div>
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {summary.lines.map((l) => (
                  <li key={l.exercise} className="flex items-baseline justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      <span className="font-semibold">{l.sets}×</span> {l.exercise}
                      {l.pr && " 🏆"}
                    </span>
                    <span className="shrink-0 text-muted">
                      {l.unit === "REPS" ? `${formatKg(l.volume)} kg` : formatAmount(l.amount, l.unit)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary && step === "save" && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Judul latihan
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-base font-normal focus:border-accent focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Tile value={formatDuration(summary.durationSec)} label="Durasi" />
                <Tile value={`${formatKg(summary.totalVolume)}`} label="Volume (kg)" />
                <Tile value={String(summary.totalSets)} label="Set" />
              </div>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Catatan <span className="font-normal text-muted">(opsional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Gimana latihannya hari ini?"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-base font-normal focus:border-accent focus:outline-none"
                />
              </label>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1 text-sm font-semibold">Dilihat oleh</legend>
                {VISIBILITY.map((v) => (
                  <label
                    key={v.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      visibility === v.value ? "border-accent bg-accent/5" : "border-border"
                    }`}
                  >
                    <input type="radio" name="visibility" checked={visibility === v.value} onChange={() => setVisibility(v.value)} className="accent-[var(--color-accent)]" />
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold">{v.label}</span>
                      <span className="text-xs text-muted">{v.hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>
          )}

          {summary && step === "done" && totals && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <p className="text-4xl">🏛️</p>
                <p className="mt-1 font-display text-2xl font-bold">Kerja bagus, {firstName}!</p>
                <p className="text-sm text-muted">Ini latihan ke-{totals.workoutNumber} kamu di Olympus.</p>
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
                {[
                  { big: String(totals.workoutNumber), unit: "latihan", sub: `${formatDuration(totals.durationSec)} · ${formatKg(totals.totalKg)} kg diangkat total` },
                  { big: formatKg(summary.totalVolume), unit: "kg hari ini", sub: eq ? `${eq.emoji} setara ${formatKg(eq.factor)}× ${eq.name}` : "" },
                  { big: String(summary.prCount), unit: "rekor pribadi", sub: summary.prCount ? "Rekor baru hari ini 🏆" : "Terus dorong, rekor menunggu!" },
                  ...(cal ? [{ big: `±${cal.kcal.toLocaleString("id-ID")}`, unit: "kcal terbakar", sub: "Estimasi dari durasi & berat badan, bukan angka pasti 🔥" }] : []),
                  { big: String(totals.daysThisWeek), unit: "hari minggu ini", sub: totals.daysThisWeek >= 3 ? "Konsisten seperti dewa Olympus ⚡" : "Tambah satu hari lagi minggu ini?" },
                ].map((c) => (
                  <div
                    key={c.unit}
                    className="flex w-[78%] shrink-0 snap-center flex-col items-center justify-center rounded-2xl bg-nav-bg px-4 py-6 text-center text-white [background-image:radial-gradient(20rem_9rem_at_50%_0%,rgb(37_99_235/0.55),transparent)]"
                  >
                    <p className="font-display text-5xl font-bold">{c.big}</p>
                    <p className="text-sm font-semibold uppercase tracking-wider text-white/80">{c.unit}</p>
                    {c.sub && <p className="mt-2 text-xs text-white/65">{c.sub}</p>}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSticker(true)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-nav-bg text-sm font-semibold text-white hover:opacity-90"
              >
                🖼️ Stiker latihan <span className="text-xs font-normal text-white/70">PNG transparan</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStory(true)}
                  className="h-11 rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-2"
                >
                  📸 Story volume
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center rounded-xl bg-[#22c55e] text-sm font-semibold text-white"
                >
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(shareText).then(() => setCopied(true), () => {});
                  }}
                  className="h-11 rounded-xl border border-border text-sm font-semibold"
                >
                  {copied ? "✓ Tersalin" : "Salin teks"}
                </button>
                <Link href="/member/feed" className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-semibold">
                  Lihat di Feed
                </Link>
              </div>
            </div>
          )}
        </div>

        {summary && (
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
            {step === "summary" && (
              <>
                <button type="button" onClick={() => setStep("save")} className="h-12 rounded-xl bg-accent font-bold text-white hover:bg-accent-2">
                  Simpan latihan
                </button>
                <button type="button" onClick={onClose} className="h-10 text-sm font-semibold text-muted hover:text-foreground">
                  Lanjut latihan dulu
                </button>
              </>
            )}
            {step === "save" && (
              <button type="button" onClick={save} disabled={pending} className="h-12 rounded-xl bg-accent font-bold text-white hover:bg-accent-2 disabled:opacity-60">
                {pending ? "Menyimpan…" : "Simpan"}
              </button>
            )}
            {step === "done" && (
              <button type="button" onClick={() => window.location.reload()} className="h-12 rounded-xl bg-nav-bg font-bold text-white">
                Selesai
              </button>
            )}
          </div>
        )}
      </div>

      {sticker && summary && (
        <WorkoutStickerModal
          title={title || defaultTitle}
          lines={summary.lines}
          levels={summary.levels}
          stats={`${formatKg(summary.totalVolume)} kg · ${summary.totalSets} set${summary.prCount ? ` · ${summary.prCount} PR` : ""}`}
          memberName={memberName}
          onClose={() => setSticker(false)}
        />
      )}
      {story && summary && (
        <VolumeStoryModal
          data={{ memberName, exerciseName: title || defaultTitle, sets: summary.sets.filter((s) => s.unit === "REPS") }}
          character={storyCharacter}
          skinTone={storySkinTone}
          onClose={() => setStory(false)}
        />
      )}
    </div>
  );
}
