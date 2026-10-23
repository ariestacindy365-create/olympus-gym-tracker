"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { LastPerformancePanel } from "@/components/member/LastPerformancePanel";
import { PRCelebrationModal, type PRCelebrationData } from "@/components/member/PRCelebrationModal";
import {
  AchievementCelebrationModal,
  type AchievementCelebrationData,
  type UnlockedBadge,
} from "@/components/shared/AchievementCelebrationModal";
import { parseLiftWeight } from "@/lib/parseWeight";
import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { VolumeStoryModal } from "@/components/member/VolumeStoryModal";
import { formatKg, totalVolume, type LifterCharacter, type SkinTone, type VolumeStoryData } from "@/lib/volumeStory";
import { epley1RM } from "@/lib/oneRepMax";
import { StepperInput } from "@/components/member/StepperInput";
import { ExercisePicker } from "@/components/member/ExercisePicker";
import { WorkoutDoneSheet } from "@/components/member/WorkoutDoneSheet";
import type { SetUnit } from "@/lib/setUnits";

const WEIGHT_STEP = 2.5;
const SAVED_FLASH_MS = 1400;

interface ExerciseOption {
  id: string;
  name: string;
}

interface ExistingSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  note: string | null;
  isPR: boolean;
}

interface LastSet {
  setNumber: number;
  weight: number;
  reps: number;
  unit?: SetUnit;
  perSide?: boolean;
  workoutDate: string;
}

interface TopSetFormProps {
  exercises: ExerciseOption[];
  defaultExerciseId: string | null;
  todaysSets: Record<string, ExistingSet[]>;
  lastSets: Record<string, LastSet[]>;
  memberName: string;
  /** Lifter picked on the member's account (null = not chosen yet). */
  storyCharacter: LifterCharacter | null;
  storySkinTone: SkinTone | null;
  /** Heaviest weight per exercise before today, for the PR "+N kg". */
  priorBestWeights?: Record<string, number>;
  onExerciseChange?: (exerciseId: string) => void;
}

export function TopSetForm({
  exercises,
  defaultExerciseId,
  todaysSets,
  lastSets,
  memberName,
  storyCharacter,
  storySkinTone,
  priorBestWeights = {},
  onExerciseChange,
}: TopSetFormProps) {
  const confirmDialog = useConfirm();
  const initialExerciseId = defaultExerciseId ?? exercises[0]?.id ?? "";
  const [exerciseId, setExerciseId] = useState(initialExerciseId);
  const [saved, setSaved] = useState(todaysSets);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSavedPR, setJustSavedPR] = useState(false);
  const [celebration, setCelebration] = useState<PRCelebrationData | null>(null);
  const [volumeCard, setVolumeCard] = useState<VolumeStoryData | null>(null);
  const character = storyCharacter;
  const skinTone = storySkinTone;
  const [achievementCelebration, setAchievementCelebration] = useState<AchievementCelebrationData | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [doneSheet, setDoneSheet] = useState(false);

  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [rowPendingId, setRowPendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function handleExerciseChange(id: string) {
    setExerciseId(id);
    setWeight("");
    setReps("");
    setNote("");
    setJustSavedPR(false);
    setError(null);
    setEditingSetId(null);
    onExerciseChange?.(id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const weightNum = parseLiftWeight(weight);
    const repsNum = Number(reps);
    if (weightNum === null || !repsNum || repsNum <= 0) {
      setError("Isi beban dan reps yang valid.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/member/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, weight: weightNum, reps: repsNum, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan set.");
        return;
      }

      const newSet: ExistingSet = {
        id: data.setEntry.id,
        setNumber: data.setEntry.setNumber,
        weight: weightNum,
        reps: repsNum,
        note: note || null,
        isPR: data.setEntry.isPR,
      };
      setSaved((prev) => ({
        ...prev,
        [exerciseId]: [...(prev[exerciseId] ?? []), newSet],
      }));
      // A PR no longer interrupts the workout with a popup: the set gets a
      // 🏆 and the share card waits on the "Selesai" screen.
      setJustSavedPR(newSet.isPR);
      const newAchievements: UnlockedBadge[] = data.newAchievements ?? [];
      if (newAchievements.length > 0) setAchievementCelebration({ memberName, badges: newAchievements });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), SAVED_FLASH_MS);
      // Keep beban/reps filled: the next set is usually the same or one
      // small step away, so members only tap "Log Set" again.
      setNote("");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  function startEdit(s: ExistingSet) {
    setEditingSetId(s.id);
    setEditWeight(String(s.weight));
    setEditReps(String(s.reps));
    setRowError(null);
  }

  function cancelEdit() {
    setEditingSetId(null);
    setRowError(null);
  }

  async function saveEdit(setId: string) {
    setRowError(null);
    const weightNum = parseLiftWeight(editWeight);
    const repsNum = Number(editReps);
    if (weightNum === null || !repsNum || repsNum <= 0) {
      setRowError("Isi beban dan reps yang valid.");
      return;
    }

    setRowPendingId(setId);
    try {
      const res = await fetch(`/api/member/sets/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: weightNum, reps: repsNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRowError(data.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      setSaved((prev) => ({
        ...prev,
        [exerciseId]: data.sets.map((s: ExistingSet) => ({
          id: s.id,
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          note: s.note,
          isPR: s.isPR,
        })),
      }));
      setEditingSetId(null);
    } catch {
      setRowError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setRowPendingId(null);
    }
  }

  async function handleDelete(setId: string) {
    if (!(await confirmDialog({ description: "Hapus set ini?", confirmLabel: "Hapus", danger: true }))) return;
    setRowPendingId(setId);
    setRowError(null);
    try {
      const res = await fetch(`/api/member/sets/${setId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setRowError(data.error ?? "Gagal menghapus set.");
        return;
      }
      setSaved((prev) => ({
        ...prev,
        [exerciseId]: data.sets.map((s: ExistingSet) => ({
          id: s.id,
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          note: s.note,
          isPR: s.isPR,
        })),
      }));
    } catch {
      setRowError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setRowPendingId(null);
    }
  }

  const currentSets = saved[exerciseId] ?? [];
  const lastExerciseSets = lastSets[exerciseId] ?? [];

  // Reopen the share card for one of today's PR sets (the celebration only
  // shows once, right after saving).
  function reopenCelebration(s: ExistingSet) {
    const firstSetToday = Math.min(...currentSets.map((c) => c.setNumber));
    setCelebration({
      memberName,
      exerciseName: exercises.find((ex) => ex.id === exerciseId)?.name ?? "",
      weight: s.weight,
      reps: s.reps,
      estimated1RM: epley1RM(s.weight, s.reps),
      isDebut: lastExerciseSets.length === 0 && s.setNumber === firstSetToday,
    });
  }
  // "Ulangi" suggestion: today's latest set, else the first set from last session.
  const repeatSource = currentSets.at(-1) ?? lastExerciseSets[0] ?? null;
  const repeatLabel = currentSets.length > 0 ? "Ulangi set terakhir" : "Pakai sesi lalu";
  const repeatMatches =
    repeatSource != null && parseLiftWeight(weight) === repeatSource.weight && Number(reps) === repeatSource.reps;

  const exerciseName = exercises.find((ex) => ex.id === exerciseId)?.name ?? "";
  const storySets = currentSets.map((s) => ({ weight: s.weight, reps: s.reps }));
  const prSets = currentSets.filter((s) => s.isPR);
  const bestPR = prSets.reduce<ExistingSet | null>(
    (best, s) => (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best),
    null
  );
  const priorBest = priorBestWeights[exerciseId];
  const prGain = bestPR && priorBest != null ? Math.round((bestPR.weight - priorBest) * 10) / 10 : null;
  const heaviest = currentSets.reduce<ExistingSet | null>((h, s) => (!h || s.weight > h.weight ? s : h), null);
  const doneIds = new Set(Object.entries(saved).filter(([, list]) => list.length > 0).map(([id]) => id));
  const recentIds = Object.entries(lastSets)
    .filter(([, list]) => list.length > 0)
    .sort((a, b) => b[1][0].workoutDate.localeCompare(a[1][0].workoutDate))
    .map(([id]) => id);

  function openVolumeCard() {
    setVolumeCard({
      memberName,
      exerciseName,
      sets: storySets,
      prLabel: bestPR
        ? `${formatKg(bestPR.weight)} KG × ${bestPR.reps}${prGain != null && prGain > 0 ? ` · +${formatKg(prGain)} KG` : ""}`
        : undefined,
    });
  }

  const nextSetNumber = currentSets.length > 0 ? Math.max(...currentSets.map((s) => s.setNumber)) + 1 : 1;

  return (
    <Card>
      <h3 className="font-display text-lg font-semibold">Catat Latihan Hari Ini</h3>
      <p className="mb-4 text-xs text-muted">Catat setiap set (beban &amp; reps). Setelah set terakhir, tekan Selesai.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Gerakan</label>
          <ExercisePicker
            exercises={exercises}
            value={exerciseId}
            onChange={handleExerciseChange}
            coachExerciseId={defaultExerciseId}
            recentIds={recentIds}
            doneIds={doneIds}
          />
        </div>

        {currentSets.length === 0 && <LastPerformancePanel lastSets={lastExerciseSets} />}

        {currentSets.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <ul className="divide-y divide-border">
              {currentSets.map((s) =>
                editingSetId === s.id ? (
                  <li key={s.id} className="flex flex-col gap-2 bg-surface-2 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-xs font-semibold text-muted">SET {s.setNumber}</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        className="!py-1"
                        placeholder="kg"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={editReps}
                        onChange={(e) => setEditReps(e.target.value)}
                        className="!py-1"
                        placeholder="reps"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={cancelEdit}>
                        Batal
                      </Button>
                      <Button
                        type="button"
                        className="px-2 py-1 text-xs"
                        disabled={rowPendingId === s.id}
                        onClick={() => saveEdit(s.id)}
                      >
                        {rowPendingId === s.id ? "..." : "Simpan"}
                      </Button>
                    </div>
                  </li>
                ) : (
                  <li key={s.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className="w-11 shrink-0 text-[11px] font-semibold text-muted">SET {s.setNumber}</span>
                    <span className="tabular min-w-0 flex-1 whitespace-nowrap font-semibold">
                      {formatKg(s.weight)} kg × {s.reps}
                    </span>
                    {s.isPR && (
                      <button
                        type="button"
                        onClick={() => reopenCelebration(s)}
                        aria-label="Bagikan PR"
                        title="Rekor baru — tap untuk bagikan"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-base ring-1 ring-accent/40 transition hover:bg-accent/25"
                      >
                        🏆
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      disabled={rowPendingId === s.id}
                      aria-label="Edit set"
                      className="rounded-md p-1.5 text-base text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      disabled={rowPendingId === s.id}
                      aria-label="Hapus set"
                      className="rounded-md p-1.5 text-base text-muted transition hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                )
              )}
            </ul>
            <div className="flex items-center justify-between gap-2 bg-surface-2 px-3 py-2 text-xs text-muted">
              <span>
                {currentSets.length} set
                {heaviest && ` · terberat ${formatKg(heaviest.weight)} kg`}
              </span>
              <span>
                Volume <span className="tabular font-semibold text-foreground">{formatKg(totalVolume(currentSets))} kg</span>
              </span>
            </div>
          </div>
        )}
        {rowError && <p className="text-sm text-danger">{rowError}</p>}

        {repeatSource && !repeatMatches && (
          <button
            type="button"
            onClick={() => {
              setWeight(String(repeatSource.weight));
              setReps(String(repeatSource.reps));
            }}
            className="self-start rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent hover:text-accent"
          >
            ↺ {repeatLabel}: {formatKg(repeatSource.weight)} kg × {repeatSource.reps}
          </button>
        )}

        <div>
          <div className="flex gap-3">
            <StepperInput label="Beban (kg)" value={weight} onChange={setWeight} step={WEIGHT_STEP} decimal placeholder="mis. 40" />
            <StepperInput label="Reps" value={reps} onChange={setReps} step={1} placeholder="mis. 8" />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Tombol − / + mengubah beban 2,5 kg dan reps 1.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
            Catatan (opsional)
          </label>
          <Input
            type="text"
            placeholder="mis. terasa ringan, form rapi"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {justSavedPR && (
          <p className="text-sm text-accent">
            🏆 Rekor baru! Kartunya bisa dibagikan saat kamu tekan <span className="font-semibold">Selesai</span>, atau
            lewat tombol <span className="font-semibold">🏆</span> di set itu.
          </p>
        )}

        <Button
          type="submit"
          variant={currentSets.length > 0 ? "secondary" : "primary"}
          disabled={pending || savedFlash}
          className="w-full py-3"
        >
          {pending ? "Menyimpan..." : savedFlash ? "✓ Tersimpan!" : `+ Tambah Set ${nextSetNumber}`}
        </Button>
        {currentSets.length > 0 && (
          <Button type="button" onClick={() => setDoneSheet(true)} className="w-full py-3">
            🏁 Selesai {exerciseName}
          </Button>
        )}
      </form>

      {doneSheet && currentSets.length > 0 && (
        <WorkoutDoneSheet
          memberName={memberName}
          exerciseName={exerciseName}
          sets={storySets}
          prSet={bestPR}
          prGain={prGain}
          character={character}
          skinTone={skinTone}
          onSharePR={() => bestPR && reopenCelebration(bestPR)}
          onShareVolume={openVolumeCard}
          onClose={() => setDoneSheet(false)}
        />
      )}
      {celebration && (
        <PRCelebrationModal
          data={celebration}
          onClose={() => setCelebration(null)}
        />
      )}
      {volumeCard && (
        <VolumeStoryModal
          data={volumeCard}
          character={character}
          skinTone={skinTone}
          onClose={() => setVolumeCard(null)}
        />
      )}
      {achievementCelebration && (
        <AchievementCelebrationModal
          data={achievementCelebration}
          onClose={() => setAchievementCelebration(null)}
        />
      )}
    </Card>
  );
}
