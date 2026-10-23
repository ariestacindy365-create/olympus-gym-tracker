"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MuscleMap } from "@/components/shared/MuscleMap";
import { DayFinishFlow } from "@/components/member/DayFinishFlow";
import {
  AchievementCelebrationModal,
  type AchievementCelebrationData,
  type UnlockedBadge,
} from "@/components/shared/AchievementCelebrationModal";
import { formatKg, type LifterCharacter, type SkinTone } from "@/lib/volumeStory";
import { UNIT_LABEL } from "@/lib/setUnits";
import { parseLiftWeight } from "@/lib/parseWeight";
import { mainMuscles, muscleLoad, muscleLevels, type MuscleKey } from "@/lib/muscles";
import type { TodayPlan } from "@/lib/todayPlan";
import { CLASS_COOKIE } from "@/lib/classCookie";

export interface LoggedSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  isPR: boolean;
}

interface Row {
  w: string;
  r: string;
  saved: LoggedSet | null;
  pending: boolean;
}

interface TodayWorkoutPlanProps {
  plan: TodayPlan;
  todaysSets: Record<string, LoggedSet[]>;
  /** Heaviest recent weight per exercise, shown as "Terakhir" and prefilled. */
  lastWeights: Record<string, number>;
  memberName: string;
  storyCharacter: LifterCharacter | null;
  storySkinTone: SkinTone | null;
  defaultVisibility: "ALL" | "COACH" | "PRIVATE";
}

/**
 * Today's class program as a ready-to-fill workout: every movement with one
 * row per set. Members type beban & reps (prefilled from last time / the
 * target) and tap ✓; "Selesai latihan hari ini" wraps the day up.
 */
export function TodayWorkoutPlan({
  plan,
  todaysSets,
  lastWeights,
  memberName,
  storyCharacter,
  storySkinTone,
  defaultVisibility,
}: TodayWorkoutPlanProps) {
  const router = useRouter();
  const items = useMemo(() => plan.rounds.flatMap((r) => r.items), [plan]);
  const [rows, setRows] = useState<Row[][]>(() =>
    items.map((it) => {
      const logged = todaysSets[it.exerciseId] ?? [];
      const count = Math.max(it.sets, ...logged.map((s) => s.setNumber));
      return Array.from({ length: count }, (_, i) => {
        const s = logged.find((l) => l.setNumber === i + 1) ?? null;
        return { w: s ? String(s.weight) : "", r: s ? String(s.reps) : "", saved: s, pending: false };
      });
    })
  );
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<AchievementCelebrationData | null>(null);
  const [finishing, setFinishing] = useState(false);

  const done = rows.flat().filter((r) => r.saved);
  const total = rows.flat().length;
  // Volume counts rep sets only (timed / lap / distance sets add 0 kg).
  const unitOfRow = new Map(rows.flatMap((rs, i) => rs.map((r) => [r, items[i].unit] as const)));
  const volume = done.reduce((a, r) => a + (unitOfRow.get(r) === "REPS" ? r.saved!.weight * r.saved!.reps : 0), 0);

  // Planned muscles glow faintly; logged ones light up by how many sets they got.
  const levels = useMemo(() => {
    const planned = muscleLoad(items.map((it) => ({ muscles: it.muscles, sets: 1 })));
    const logged = muscleLevels(muscleLoad(items.map((it, i) => ({ muscles: it.muscles, sets: rows[i].filter((r) => r.saved).length }))));
    const out: Partial<Record<MuscleKey, number>> = {};
    for (const k of Object.keys(planned) as MuscleKey[]) out[k] = 1;
    for (const [k, v] of Object.entries(logged) as [MuscleKey, number][]) out[k] = Math.max(2, v);
    return out;
  }, [items, rows]);

  function update(i: number, j: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((rs, a) => (a !== i ? rs : rs.map((r, b) => (b !== j ? r : { ...r, ...patch })))));
  }

  function weightHint(i: number, j: number) {
    const prev = j > 0 ? rows[i][j - 1] : null;
    const prevW = prev?.saved ? String(prev.saved.weight) : prev?.w;
    return prevW || (lastWeights[items[i].exerciseId] != null ? String(lastWeights[items[i].exerciseId]) : "");
  }

  async function save(i: number, j: number) {
    const it = items[i];
    const row = rows[i][j];
    const wRaw = row.w || weightHint(i, j);
    const rRaw = row.r || (it.repDefault != null ? String(it.repDefault) : "");
    const weight = parseLiftWeight(wRaw || "");
    const reps = Number(rRaw);
    if (weight === null || !reps || reps <= 0) {
      setError(`${it.label} set ${j + 1}: isi beban (0 untuk tanpa beban) dan ${UNIT_LABEL[it.unit]}.`);
      return;
    }
    setError(null);
    update(i, j, { w: String(weight), r: String(reps), pending: true });
    try {
      const res = await fetch("/api/member/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: it.exerciseId, weight, reps, unit: it.unit, setNumber: j + 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan set.");
      update(i, j, {
        pending: false,
        saved: { id: data.setEntry.id, setNumber: j + 1, weight: data.setEntry.weight, reps: data.setEntry.reps, isPR: data.setEntry.isPR },
      });
      const badges: UnlockedBadge[] = data.newAchievements ?? [];
      if (badges.length > 0) setCelebration({ memberName, badges });
    } catch (e) {
      update(i, j, { pending: false });
      setError(e instanceof Error ? e.message : "Gagal menyimpan set.");
    }
  }

  // Index of each round's first item in the flat `items` / `rows` arrays.
  const roundStart = plan.rounds.map((_, r) => plan.rounds.slice(0, r).reduce((a, x) => a + x.items.length, 0));
  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-2xl bg-nav-bg p-4 text-white shadow-raised [background-image:radial-gradient(28rem_10rem_at_100%_0%,rgb(37_99_235/0.5),transparent)]">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-nav-muted">
            {plan.dayLabel} · {plan.klass ? `Kelas ${plan.klass.label}` : "Program dari pelatih"}
          </p>
          {plan.classOptions.length > 1 && (
            <label className="flex items-center gap-1 text-[11px] text-white/70">
              Ganti kelas
              <select
                value={plan.klass?.sessionId ?? ""}
                onChange={(e) => {
                  // Remembered for today only; the server reads it on refresh.
                  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
                  document.cookie = `${CLASS_COOKIE}=${encodeURIComponent(`${day}|${e.target.value}`)}; path=/; max-age=86400; samesite=lax`;
                  router.refresh();
                }}
                aria-label="Ganti kelas"
                className="h-7 rounded-md border border-white/20 bg-white/10 px-1.5 text-[12px] font-semibold text-white focus:outline-none [&>option]:text-foreground"
              >
                {plan.classOptions.map((o) => (
                  <option key={o.sessionId} value={o.sessionId}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <h2 className="mt-0.5 font-display text-2xl font-bold uppercase tracking-wide">{plan.title}</h2>
        {plan.borrowedFrom && (
          <p className="text-[12px] text-white/65">Coach kelas ini belum mengisi program minggu ini, jadi yang tampil program {plan.borrowedFrom}.</p>
        )}
        <div className="mt-2 flex justify-between text-sm text-white/75">
          <span>
            {done.length} / {total} set
          </span>
          <span>Volume {formatKg(volume)} kg</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#22c55e] transition-[width]" style={{ width: `${total ? (done.length / total) * 100 : 0}%` }} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <MuscleMap levels={levels} height={104} tone="dark" />
          <p className="text-[13px] text-white/70">Otot yang dilatih hari ini. Menyala lebih terang saat set kamu tercatat.</p>
        </div>
        <Link
          href="/member/program"
          className="mt-3 flex h-10 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/20"
        >
          📋 Lihat slide program · ▶ Slideshow
        </Link>
      </div>

      {plan.rounds.map((round, r) => (
        <div key={round.number} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex items-baseline justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
            <span className="font-display text-lg font-bold">Round {round.number}</span>
            {round.schemeLine && <span className="text-xs font-bold uppercase tracking-wide text-accent">{round.schemeLine}</span>}
          </div>
          {round.items.map((it, k) => {
            const i = roundStart[r] + k;
            const muscles = mainMuscles(it.muscles);
            const last = lastWeights[it.exerciseId];
            return (
              <div key={it.label + it.exerciseId} className="border-b border-border px-4 pb-3 pt-2.5 last:border-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-sm font-bold text-accent">{it.label}</span>
                  <span className="font-semibold">{it.name}</span>
                  {it.target && <span className="text-xs text-muted">· {it.target}</span>}
                </p>
                {muscles.length > 0 && <p className="text-[11.5px] font-semibold text-accent">🎯 {muscles.join(" · ")}</p>}
                <p className="mb-1 text-[11.5px] text-muted">
                  {last != null ? `Terakhir: ${formatKg(last)} kg` : "Belum pernah dicatat"}
                  {it.repDefault != null
                    ? ` · target ${it.repDefault} ${UNIT_LABEL[it.unit]}`
                    : ` · isi ${UNIT_LABEL[it.unit]} yang selesai`}
                </p>
                {rows[i].map((row, j) => {
                  const savedNow = row.saved && row.w === String(row.saved.weight) && row.r === String(row.saved.reps);
                  return (
                    <div key={j} className="mt-1.5 grid grid-cols-[52px_1fr_1fr_44px] items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase text-muted">
                        Set {j + 1}
                        {row.saved?.isPR && " 🏆"}
                      </span>
                      <label className="relative">
                        <input
                          inputMode="decimal"
                          value={row.w}
                          placeholder={weightHint(i, j) || "kg"}
                          onChange={(e) => update(i, j, { w: e.target.value })}
                          aria-label={`${it.label} set ${j + 1} beban`}
                          className={`h-11 w-full min-w-0 rounded-lg border px-2 pr-7 text-center text-base font-semibold text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none ${
                            savedNow ? "border-transparent bg-success/10" : "border-border bg-surface"
                          }`}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">kg</span>
                      </label>
                      <label className="relative">
                        <input
                          inputMode="numeric"
                          value={row.r}
                          placeholder={it.repDefault != null ? String(it.repDefault) : UNIT_LABEL[it.unit]}
                          onChange={(e) => update(i, j, { r: e.target.value })}
                          aria-label={`${it.label} set ${j + 1} ${UNIT_LABEL[it.unit]}`}
                          className={`h-11 w-full min-w-0 rounded-lg border px-2 pr-9 text-center text-base font-semibold text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none ${
                            savedNow ? "border-transparent bg-success/10" : "border-border bg-surface"
                          }`}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                          {UNIT_LABEL[it.unit]}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => save(i, j)}
                        disabled={row.pending}
                        aria-label={`Simpan ${it.label} set ${j + 1}`}
                        className={`h-11 rounded-lg text-lg font-bold transition disabled:opacity-60 ${
                          savedNow ? "bg-success text-white" : "border border-border bg-surface-2 text-muted hover:text-foreground"
                        }`}
                      >
                        {row.pending ? "…" : "✓"}
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.map((rs, a) => (a === i ? [...rs, { w: "", r: "", saved: null, pending: false }] : rs)))}
                  className="mt-2 text-xs font-semibold text-accent hover:underline"
                >
                  + Tambah set
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="sticky bottom-[5.5rem] z-20 sm:bottom-4">
        <button
          type="button"
          onClick={() => setFinishing(true)}
          disabled={done.length === 0}
          className="flex w-full flex-col items-center rounded-2xl bg-accent py-3 text-white shadow-overlay transition hover:bg-accent-2 disabled:opacity-60"
        >
          <span className="text-base font-bold">🏁 Selesai latihan hari ini</span>
          <span className="text-[11px] opacity-85">
            {done.length} set tercatat · {formatKg(volume)} kg
          </span>
        </button>
      </div>

      {finishing && (
        <DayFinishFlow
          title={plan.title}
          memberName={memberName}
          storyCharacter={storyCharacter}
          storySkinTone={storySkinTone}
          defaultVisibility={defaultVisibility}
          classLabel={plan.klass?.label ?? null}
          onClose={() => setFinishing(false)}
        />
      )}
      {celebration && <AchievementCelebrationModal data={celebration} onClose={() => setCelebration(null)} />}
    </section>
  );
}
