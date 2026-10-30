"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MuscleMap } from "@/components/shared/MuscleMap";
import { UndoDeleteButton } from "@/components/ui/UndoDeleteButton";
import { DayFinishFlow } from "@/components/member/DayFinishFlow";
import {
  AchievementCelebrationModal,
  type AchievementCelebrationData,
  type UnlockedBadge,
} from "@/components/shared/AchievementCelebrationModal";
import { formatKg, type LifterCharacter, type SkinTone } from "@/lib/volumeStory";
import { UNIT_LABEL, setVolume } from "@/lib/setUnits";
import { isNoWeightExercise, shouldShowWeight } from "@/lib/bodyweight";
import { parseLiftWeight } from "@/lib/parseWeight";
import { mainMuscles, muscleLoad, muscleLevels, type MuscleKey } from "@/lib/muscles";
import type { TodayPlan } from "@/lib/todayPlan";
import { CLASS_COOKIE } from "@/lib/classCookie";
import { getPendingStorageError, downloadPending, addPending, jakartaToday, loadPending, removePending, type PendingSet } from "@/lib/pendingSets";

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
  /** Ticked without signal: kept on the phone until it reaches the server. */
  queued?: boolean;
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
  /** "YYYY-MM-DD" when filling in a past day instead of today. */
  date?: string | null;
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
  date = null,
}: TodayWorkoutPlanProps) {
  const router = useRouter();
  // The day these sets belong to: the past day being filled in, else today (Jakarta).
  const [day] = useState(() => date ?? jakartaToday());
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
  const [kgOpen, setKgOpen] = useState<Record<number, boolean>>({});
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<AchievementCelebrationData | null>(null);
  const [finishing, setFinishing] = useState(false);

  // A mistaken set: delete it here. Its row goes back to empty (rows are set
  // numbers), and an extra row past the program's sets goes away.
  async function removeSet(i: number, j: number, id: string) {
    const res = await fetch(`/api/member/sets/${id}`, { method: "DELETE", keepalive: true }).catch(() => null);
    if (!res?.ok) {
      setError("Gagal menghapus set. Coba lagi.");
      return;
    }
    setError(null);
    setRows((prev) =>
      prev.map((rs, a) => {
        if (a !== i) return rs;
        const next = rs.map((row, b) => (b === j ? { w: "", r: "", saved: null, pending: false } : row));
        while (next.length > items[i].sets && !next[next.length - 1].saved && !next[next.length - 1].queued) next.pop();
        return next;
      })
    );
    router.refresh();
  }

  // TABATA, bodyweight and banded movements need no logging and stay
  // collapsed until opened ("Catat beban"), then show reps with optional + kg.
  const [logAnyway, setLogAnyway] = useState<Set<number>>(() => new Set());
  const logged = (i: number) => !items[i].noInput || logAnyway.has(i) || rows[i].some((r) => r.saved || r.queued);
  const inputRows = rows.filter((_, i) => logged(i)).flat();
  const done = rows.flat().filter((r) => r.saved);
  const queuedCount = rows.flat().filter((r) => r.queued).length;
  const total = inputRows.length;
  // Volume counts rep sets only (timed / lap / distance sets add 0 kg).
  // and a per-side ("each") set counts both sides.
  const itemOfRow = new Map(rows.flatMap((rs, i) => rs.map((r) => [r, items[i]] as const)));
  const volume = done.reduce((a, r) => a + setVolume({ ...r.saved!, unit: itemOfRow.get(r)?.unit, perSide: itemOfRow.get(r)?.perSide }), 0);

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

  function showKg(i: number) {
    const item = items[i];
    return shouldShowWeight(item.noWeight ?? isNoWeightExercise(item.name), !!kgOpen[i], lastWeights[item.exerciseId], rows[i]);
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
    const weight = showKg(i) ? parseLiftWeight(wRaw || "") : 0;
    const reps = Number(rRaw);
    if (weight === null || !reps || reps <= 0) {
      setError(`${it.label} set ${j + 1}: isi beban (0 untuk tanpa beban) dan ${UNIT_LABEL[it.unit]}.`);
      return;
    }
    setError(null);
    update(i, j, { w: String(weight), r: String(reps), pending: true });
    const p: PendingSet = {
      owner: memberName,
      date: day,
      exerciseId: it.exerciseId,
      setNumber: j + 1,
      // Always the explicit day, so a set sent after midnight keeps its date.
      body: { exerciseId: it.exerciseId, weight, reps, unit: it.unit, perSide: it.perSide, setNumber: j + 1, date: day },
    };
    const tappedAt = new Date().toISOString();
    const result = await send(p);
    if (result === "offline") {
      // Keep the tap time so the late set still counts at the right moment.
      const stored = addPending({ ...p, body: { ...p.body, loggedAt: tappedAt } });
      setStorageWarning(stored.error);
      update(i, j, { pending: false, queued: true });
    } else if (result === "ok") {
      if (row.queued) {
        const stored = removePending(p);
        setStorageWarning(stored.error);
      }
    } else {
      update(i, j, { pending: false });
      setError(result);
    }
  }

  // Sets go out one at a time: a tap while another set is still sending
  // waits its turn instead of being dropped.
  const sendQueue = useRef<Promise<unknown>>(Promise.resolve());

  /** POSTs one set and fills its row; "offline" when the network failed, else an error message. */
  const sendNow = useCallback(
    async (p: PendingSet): Promise<"ok" | "offline" | string> => {
      let res: Response;
      try {
        res = await fetch("/api/member/sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p.body) });
      } catch {
        return "offline";
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Gagal menyimpan set.";
      if (!data.setEntry?.id) return "Server belum mengonfirmasi set. Isian tetap dipertahankan.";
      const i = items.findIndex((it) => it.exerciseId === p.exerciseId);
      if (i >= 0) {
        setRows((prev) =>
          prev.map((rs, a) =>
            a !== i
              ? rs
              : rs.map((r, b) =>
                  b !== p.setNumber - 1
                    ? r
                    : {
                        ...r,
                        pending: false,
                        queued: false,
                        saved: { id: data.setEntry.id, setNumber: p.setNumber, weight: data.setEntry.weight, reps: data.setEntry.reps, isPR: data.setEntry.isPR },
                      }
                )
          )
        );
      }
      const badges: UnlockedBadge[] = data.newAchievements ?? [];
      if (badges.length > 0) setCelebration({ memberName, badges });
      return "ok";
    },
    [items, memberName]
  );

  const send = useCallback(
    (p: PendingSet): Promise<"ok" | "offline" | string> => {
      const run = sendQueue.current.then(() => sendNow(p));
      sendQueue.current = run.catch(() => undefined);
      return run;
    },
    [sendNow]
  );

  useEffect(() => {
    function guard(event: BeforeUnloadEvent) {
      const unsaved = rows.some((list) => list.some((row) => row.queued || ((row.w || row.r) && (!row.saved || row.w !== String(row.saved.weight) || row.r !== String(row.saved.reps)))));
      if (unsaved) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [rows]);

  // Queued sets go out on load, when the phone gets signal back, and every
  // 15 s while any are waiting.
  const flushing = useRef(false);
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const p of loadPending(memberName, day)) {
        const result = await send(p);
        if (result === "offline") break;
        if (result !== "ok") { setError(`Set ${p.setNumber} belum terkirim: ${result}. Isian tetap disimpan untuk dicoba lagi.`); break; }
        const stored = removePending(p);
        setStorageWarning(stored.error);
      }
    } finally {
      flushing.current = false;
    }
  }, [memberName, day, send]);

  useEffect(() => {
    // Show what's still waiting from an earlier visit, then try to send it.
    const waiting = loadPending(memberName, day);
    const t = setTimeout(() => {
      setStorageWarning(getPendingStorageError());
      if (waiting.length > 0) {
        setRows((prev) =>
          prev.map((existing, i) => {
            const count = Math.max(existing.length, ...waiting.filter((p) => p.exerciseId === items[i]?.exerciseId).map((p) => p.setNumber));
            return Array.from({ length: count }, (_, j) => {
              const row = existing[j] ?? { w: "", r: "", saved: null, pending: false };
              const queued = waiting.find((p) => p.exerciseId === items[i]?.exerciseId && p.setNumber === j + 1);
              return queued && !row.saved ? { ...row, w: String(queued.body.weight), r: String(queued.body.reps), queued: true } : row;
            });
          })
        );
      }
      void flush();
    }, 0);
    window.addEventListener("online", flush);
    return () => {
      clearTimeout(t);
      window.removeEventListener("online", flush);
    };
  }, [memberName, day, items, flush]);

  useEffect(() => {
    if (queuedCount === 0) return;
    const id = setInterval(flush, 15_000);
    return () => clearInterval(id);
  }, [queuedCount, flush]);

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
                  if (date) {
                    router.push(`/member/dashboard?tgl=${date}&kelas=${encodeURIComponent(e.target.value)}`);
                    return;
                  }
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
          <p className="text-[13px] text-white/70">
            Otot yang dilatih{date ? "" : " hari ini"}. Menyala lebih terang saat set kamu tercatat.
          </p>
        </div>
        {!date && (
          <Link
            href="/member/program"
            className="mt-3 flex h-10 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/20"
          >
            📋 Lihat slide program · ▶ Slideshow
          </Link>
        )}
      </div>

      {plan.rounds.map((round, r) => (
        <div key={round.number} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex items-baseline justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
            <span className="font-display text-lg font-bold">Round {round.number}</span>
            <span className="flex items-baseline gap-2">
              {round.items.every((_, k) => !logged(roundStart[r] + k)) && (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10.5px] font-bold uppercase text-success">Tanpa catat</span>
              )}
              {round.schemeLine && <span className="text-xs font-bold uppercase tracking-wide text-accent">{round.schemeLine}</span>}
            </span>
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
                  {it.note && <span className="text-sm text-foreground/80">({it.note})</span>}
                  {it.target && <span className="text-xs text-muted">· {it.target}</span>}
                </p>
                {muscles.length > 0 && <p className="text-[11.5px] font-semibold text-accent">🎯 {muscles.join(" · ")}</p>}
                {!logged(i) ? (
                  <div className="mt-1 flex items-center justify-between gap-3 text-[12px]">
                    <span className="font-semibold text-success">✓ Cukup dikerjakan, tidak perlu dicatat</span>
                    <button
                      type="button"
                      onClick={() => setLogAnyway((prev) => new Set(prev).add(i))}
                      className="shrink-0 font-semibold text-accent hover:underline"
                    >
                      Catat beban
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="mb-1 text-[11.5px] text-muted">
                      {!showKg(i) ? "Tanpa beban" : last != null ? `Terakhir: ${formatKg(last)} kg` : "Belum pernah dicatat"}
                      {it.repDefault != null
                        ? ` · target ${it.repDefault} ${UNIT_LABEL[it.unit]}${it.perSide ? " tiap sisi" : ""}`
                        : ` · isi ${UNIT_LABEL[it.unit]} yang selesai`}
                    </p>
                    {rows[i].map((row, j) => {
                      const savedNow = row.saved && row.w === String(row.saved.weight) && row.r === String(row.saved.reps);
                      const field = savedNow ? "border-transparent bg-success/10" : row.queued ? "border-transparent bg-[#f59e0b]/15" : "border-border bg-surface";
                      return (
                        <div key={j} className="mt-1.5 grid grid-cols-[52px_1fr_1fr_44px_44px] items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase text-muted">
                            Set {j + 1}
                            {row.saved?.isPR && " 🏆"}
                          </span>
                      {showKg(i) ? (
                      <label className="relative">
                        <input
                          inputMode="decimal"
                          value={row.w}
                          placeholder={weightHint(i, j) || "kg"}
                          onChange={(e) => update(i, j, { w: e.target.value })}
                          aria-label={`${it.label} set ${j + 1} beban`}
                          className={`h-11 w-full min-w-0 rounded-lg border px-2 pr-7 text-center text-base font-semibold text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none ${
                            field
                          }`}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">kg</span>
                      </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setKgOpen((current) => ({ ...current, [i]: true }))}
                          aria-label={`${it.name}: tambah beban`}
                          className="flex h-11 flex-col items-center justify-center rounded-lg border border-dashed border-border text-[11px] leading-tight text-muted hover:border-accent hover:text-foreground"
                        >
                          <span>Tanpa beban</span>
                          <span className="font-semibold text-accent">+ kg</span>
                        </button>
                      )}
                          <label className="relative">
                            <input
                              inputMode="numeric"
                              value={row.r}
                              placeholder={it.repDefault != null ? String(it.repDefault) : UNIT_LABEL[it.unit]}
                              onChange={(e) => update(i, j, { r: e.target.value })}
                              aria-label={`${it.label} set ${j + 1} ${UNIT_LABEL[it.unit]}`}
                              className={`h-11 w-full min-w-0 rounded-lg border px-2 pr-9 text-center text-base font-semibold text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none ${
                                field
                              }`}
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                              {UNIT_LABEL[it.unit]}
                              {it.perSide && "/sisi"}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => save(i, j)}
                            disabled={row.pending}
                            aria-label={`Simpan ${it.label} set ${j + 1}`}
                            title={row.queued ? "Menunggu sinyal" : undefined}
                            className={`h-11 rounded-lg text-lg font-bold transition disabled:opacity-60 ${
                              savedNow
                                ? "bg-success text-white"
                                : row.queued
                                  ? "bg-[#f59e0b] text-white"
                                  : "border border-border bg-surface-2 text-muted hover:text-foreground"
                            }`}
                          >
                            {row.pending ? "…" : row.queued ? "⏳" : "✓"}
                          </button>
                          {row.saved ? (
                            <UndoDeleteButton
                              label={`${it.name}, set ${j + 1}: ${row.saved.weight} kg × ${row.saved.reps} ${UNIT_LABEL[it.unit]}`}
                              disabled={row.pending}
                              onDelete={() => removeSet(i, j, row.saved!.id)}
                            />
                          ) : (
                            <span />
                          )}
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {storageWarning && <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"><p>{storageWarning}</p><button type="button" onClick={() => downloadPending(memberName, day)} className="mt-2 min-h-11 font-semibold text-accent">Unduh cadangan set</button></div>}
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {queuedCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f59e0b]/15 px-3 py-2 text-sm">
          <span>
            📶 {queuedCount} set {storageWarning ? "di memori sementara" : "tersimpan di HP"}, dikirim otomatis saat ada sinyal.
          </span>
          <button type="button" onClick={() => void flush()} className="shrink-0 text-sm font-semibold text-accent hover:underline">
            Kirim sekarang
          </button>
        </div>
      )}

      <div className="sticky bottom-[5.5rem] z-20 sm:bottom-4">
        <button
          type="button"
          onClick={() => setFinishing(true)}
          disabled={done.length === 0 || queuedCount > 0}
          className="flex w-full flex-col items-center rounded-2xl bg-accent py-3 text-white shadow-overlay transition hover:bg-accent-2 disabled:opacity-60"
        >
          <span className="text-base font-bold">{date ? "🏁 Selesai & simpan latihan" : "🏁 Selesai latihan hari ini"}</span>
          <span className="text-[11px] opacity-85">
            {queuedCount > 0 ? `Tunggu ${queuedCount} set terkirim dulu` : `${done.length} set tercatat · ${formatKg(volume)} kg`}
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
          date={date}
          onClose={() => setFinishing(false)}
        />
      )}
      {celebration && <AchievementCelebrationModal data={celebration} onClose={() => setCelebration(null)} />}
    </section>
  );
}
