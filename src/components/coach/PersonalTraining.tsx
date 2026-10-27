"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { UndoDeleteButton } from "@/components/ui/UndoDeleteButton";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { isNoWeightExercise, shouldShowWeight } from "@/lib/bodyweight";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { DraftNotice } from "@/components/coach/DraftNotice";
import { SetFields } from "@/components/shared/SetFields";
import { formatAmount, UNIT_LABEL, UNIT_MAX, type SetUnit } from "@/lib/setUnits";
import { parseLiftWeight } from "@/lib/parseWeight";
import { personalTrainingSchema, type PersonalTrainingDay, type PersonalTrainingSet } from "@/lib/coachPersonalTraining";

interface Exercise { id: string; name: string; equipment?: string | null }
interface PreviousSet { unit?: SetUnit; perSide?: boolean; exerciseId: string; workoutDate: string; setNumber: number; weight: number; reps: number }
const dateLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function PersonalTraining({ exercises: initialExercises, initialDays, initialSets, previousSets, today, draftKey, initialVersion }: {
  draftKey: string;
  initialVersion: string | null;
  exercises: Exercise[];
  initialDays: PersonalTrainingDay[];
  initialSets: PersonalTrainingSet[];
  previousSets: PreviousSet[];
  today: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [exercises, setExercises] = useState(initialExercises);
  const [days, setDays] = useState(initialDays);
  const [version, setVersion] = useState(initialVersion);
  const [editing, setEditing] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [exerciseId, setExerciseId] = useState(initialDays[0]?.slots[0]?.exerciseId ?? exercises[0]?.id ?? "");
  const [sets, setSets] = useState(initialSets);
  const [kgOpen, setKgOpen] = useState<Record<string, boolean>>({});
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState(String(initialDays[0]?.slots[0]?.reps ?? 10));
  const [unit, setUnit] = useState<SetUnit>(initialDays[0]?.slots[0]?.unit ?? "REPS");
  const [perSide, setPerSide] = useState(initialDays[0]?.slots[0]?.perSide ?? false);
  const [note, setNote] = useState("");
  const [editSet, setEditSet] = useState<PersonalTrainingSet | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"today" | "history">("today");
  const [historyExercise, setHistoryExercise] = useState("");
  const day = days[dayIndex];
  const selectedSlot = day?.slots.find((slot) => slot.exerciseId === exerciseId);
  const todaySets = sets.filter((set) => set.workoutDate === today);
  const exerciseSets = todaySets.filter((set) => set.exerciseId === exerciseId).sort((a, b) => a.setNumber - b.setNumber);
  const last = previousSets.filter((set) => set.exerciseId === exerciseId && (set.unit ?? "REPS") === unit && !!set.perSide === perSide);
  const exercise = exercises.find((item) => item.id === exerciseId);
  const showWeight = shouldShowWeight(isNoWeightExercise(exercise?.name ?? "", exercise?.equipment), !!kgOpen[exerciseId], last[0]?.weight,
    [...exerciseSets.map((set) => ({ w: String(set.weight), saved: set })), { w: weight, saved: null }]);
  const history = sets.filter((set) => !historyExercise || set.exerciseId === historyExercise)
    .sort((a, b) => b.workoutDate.localeCompare(a.workoutDate) || a.exerciseName.localeCompare(b.exerciseName) || a.setNumber - b.setNumber);

  function registerExercises(added: Exercise[]) {
    setExercises((current) => [...current.filter((item) => !added.some((exercise) => exercise.name === item.name)), ...added.map((item) => ({ ...current.find((old) => old.name === item.name), ...item }))]
      .sort((a, b) => a.name.localeCompare(b.name)));
  }

  function chooseExercise(id: string, target?: number) {
    setExerciseId(id);
    setWeight("");
    setNote("");
    setError(null);
    const slot = day?.slots.find((item) => item.exerciseId === id);
    setUnit(slot?.unit ?? "REPS"); setPerSide(slot?.perSide ?? false);
    setReps(String(target ?? day?.slots.find((slot) => slot.exerciseId === id)?.reps ?? 10));
  }

  async function saveSet(event: React.FormEvent) {
    event.preventDefault();
    const kg = showWeight ? parseLiftWeight(weight) : 0;
    const amount = Number(reps);
    if (kg === null || kg > 2000 || !Number.isInteger(amount) || amount < 1 || amount > UNIT_MAX[unit] || !exerciseId) {
      setError("Isi beban 0–2000 kg dan jumlah yang valid sesuai satuan.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/coach/latihan/sets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, weight: kg, reps: amount, unit, perSide, note: note || undefined, date: today }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan set.");
      const saved: PersonalTrainingSet = { ...data.setEntry, exerciseName: data.exercise.name, workoutDate: today };
      registerExercises([data.exercise]);
      setExerciseId(saved.exerciseId);
      setSets((current) => [...current.filter((set) => set.id !== saved.id), saved]);
      setNote("");
      toast.success(`Set ${saved.setNumber} tersimpan${saved.isPR ? " · Rekor pribadi baru!" : ""}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan set. Coba lagi.");
    } finally { setPending(false); }
  }

  async function deleteSet(set: PersonalTrainingSet) {
    setPending(true);
    try {
      const response = await fetch(`/api/coach/latihan/sets/${set.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menghapus set.");
      setSets((current) => current.filter((item) => item.id !== set.id).map((item) => {
        const updated = data.allSets.find((entry: { id: string }) => entry.id === item.id);
        return updated ? { ...item, isPR: updated.isPR } : item;
      }));
      router.refresh();
      toast.success("Set dihapus.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Gagal menghapus set."); }
    finally { setPending(false); }
  }

  function renderSet(set: PersonalTrainingSet) {
    return (
      <li key={set.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold">{set.exerciseName} <span className="font-normal text-muted">· Set {set.setNumber}</span></p>
          <p className="mt-0.5 text-sm tabular-nums">{set.weight} kg × {formatAmount(set.reps, set.unit, set.perSide)} {set.isPR && <span className="text-xs font-semibold text-accent">· PR</span>}</p>
          {set.note && <p className="mt-1 break-words text-xs text-muted">{set.note}</p>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" disabled={pending} onClick={() => setEditSet(set)} aria-label={`Edit ${set.exerciseName} set ${set.setNumber}`}>Edit</Button>
          <UndoDeleteButton disabled={pending} label={`${set.exerciseName}, ${dateLabel(set.workoutDate)}, set ${set.setNumber}`} onDelete={() => deleteSet(set)} />
        </div>
      </li>
    );
  }

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-display text-lg font-semibold">Program pribadi</h2><p className="mt-1 text-sm text-muted">Pilih sesi, lalu catat hasil setiap set. Program ini hanya untukmu.</p></div>
          <Button variant="secondary" onClick={() => setEditing(true)}>{days.length ? "Edit program" : "Buat program"}</Button>
        </div>
        {days.length ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Pilih sesi latihan">
              {days.map((item, index) => <Button key={index} variant={index === dayIndex ? "primary" : "secondary"} aria-pressed={index === dayIndex} onClick={() => { setDayIndex(index); chooseExercise(item.slots[0].exerciseId, item.slots[0].reps); }}>{item.name}</Button>)}
            </div>
            <ul className="mt-3 divide-y divide-border">
              {day?.slots.map((slot) => {
                const count = todaySets.filter((set) => set.exerciseId === slot.exerciseId).length;
                return <li key={slot.exerciseId}><button type="button" onClick={() => chooseExercise(slot.exerciseId, slot.reps)} aria-pressed={slot.exerciseId === exerciseId} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${slot.exerciseId === exerciseId ? "bg-accent/10" : "hover:bg-surface-2"}`}><span className="text-sm font-medium">{exercises.find((exercise) => exercise.id === slot.exerciseId)?.name ?? "Gerakan"}<span className="mt-0.5 block text-xs text-muted">{slot.sets} set × {formatAmount(slot.reps, slot.unit, slot.perSide)}</span></span><span className={`shrink-0 text-xs font-semibold ${count >= slot.sets ? "text-success" : "text-muted"}`}>{count >= slot.sets ? "✓ " : ""}{count}/{slot.sets} set</span></button></li>;
              })}
            </ul>
          </>
        ) : <p className="mt-4 text-sm text-muted">Belum ada program pribadi. Kamu juga bisa langsung memilih gerakan dan mencatat set di bawah.</p>}
      </Card>

      <div className="flex gap-2" aria-label="Tampilan latihan">
        <Button variant={view === "today" ? "primary" : "secondary"} aria-pressed={view === "today"} onClick={() => setView("today")}>Catat hari ini</Button>
        <Button variant={view === "history" ? "primary" : "secondary"} aria-pressed={view === "history"} onClick={() => setView("history")}>Riwayat</Button>
      </div>

      {view === "today" ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-lg font-semibold">Catat set · {dateLabel(today)}</h2>
            <form onSubmit={saveSet} className="mt-4 flex flex-col gap-4" aria-busy={pending}>
              <label className="text-sm font-medium">Gerakan<Select className="mt-1" value={exerciseId} onChange={(event) => chooseExercise(event.target.value)} disabled={pending}><option value="" disabled>Pilih gerakan</option>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</Select></label>
              {selectedSlot && <p className="text-xs text-muted">Target: {selectedSlot.sets} set × {formatAmount(selectedSlot.reps, selectedSlot.unit, selectedSlot.perSide)} · Sudah dicatat {exerciseSets.length} set</p>}
              {last.length > 0 && <div className="rounded-lg bg-surface-2 p-3 text-sm"><p className="font-semibold">Latihan sebelumnya · {dateLabel(last[0].workoutDate)}</p><p className="mt-1 text-muted">{last.map((set) => `${set.weight} kg × ${formatAmount(set.reps, set.unit, set.perSide)}`).join(" · ")}</p><button type="button" className="mt-2 min-h-11 cursor-pointer text-sm font-semibold text-accent" onClick={() => { setWeight(String(last[0].weight)); setReps(String(last[0].reps)); }}>Pakai beban & reps set pertama</button></div>}
              <SetFields weight={weight} amount={reps} unit={unit} perSide={perSide} showWeight={showWeight} disabled={pending} onWeight={setWeight} onAmount={setReps} onUnit={setUnit} onPerSide={setPerSide} onOpenWeight={() => setKgOpen((current) => ({ ...current, [exerciseId]: true }))} />
              <p className="-mt-2 text-xs text-muted">{showWeight ? "Isi 0 kg untuk tanpa beban. Beban tetap terisi untuk set berikutnya." : "Beban otomatis 0 kg. Isi repetisi, lalu simpan set."}</p>
              <label className="text-sm font-medium">Catatan (opsional)<Input className="mt-1" maxLength={280} placeholder="Contoh: RPE 8, teknik terasa baik" value={note} onChange={(event) => setNote(event.target.value)} disabled={pending} /></label>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={pending || !exerciseId}>{pending ? "Menyimpan…" : `Simpan set ${(Math.max(0, ...exerciseSets.map((set) => set.setNumber))) + 1}`}</Button>
            </form>
          </Card>
          <Card><h2 className="font-display text-lg font-semibold">Hasil hari ini <span className="text-sm text-muted">· {todaySets.length} set</span></h2>{todaySets.length ? <ul className="mt-3">{todaySets.map(renderSet)}</ul> : <EmptyState title="Belum ada set hari ini" description="Catat set pertamamu setelah menyelesaikan gerakan." />}</Card>
        </div>
      ) : (
        <Card>
          <h2 className="font-display text-lg font-semibold">Riwayat latihan pribadi</h2>
          <p className="mt-1 text-xs text-muted">Menampilkan hingga 500 set terbaru. Mengubah program tidak menghapus hasil latihan.</p>
          <label className="mt-4 block text-sm font-medium">Filter gerakan<Select className="mt-1" value={historyExercise} onChange={(event) => setHistoryExercise(event.target.value)}><option value="">Semua gerakan</option>{exercises.filter((exercise) => sets.some((set) => set.exerciseId === exercise.id)).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</Select></label>
          {history.length ? <div className="mt-4">{[...new Set(history.map((set) => set.workoutDate))].map((date) => <section key={date} className="mt-5"><h3 className="mb-2 text-sm font-semibold text-accent">{dateLabel(date)}</h3><ul>{history.filter((set) => set.workoutDate === date).map(renderSet)}</ul></section>)}</div> : <EmptyState title="Belum ada riwayat" description="Set yang disimpan akan muncul di sini." />}
        </Card>
      )}

      {editing && <ProgramDialog draftKey={draftKey} initialVersion={version} exercises={exercises} initialDays={days} onClose={() => setEditing(false)} onSaved={(next, added, revision) => { setVersion(revision); registerExercises(added); setDays(next); setDayIndex(0); if (next[0]) chooseExercise(next[0].slots[0].exerciseId, next[0].slots[0].reps); setEditing(false); toast.success("Program pribadi tersimpan."); }} />}
      {editSet && <EditSetDialog set={editSet} onClose={() => setEditSet(null)} onSaved={(updated) => { setSets((current) => current.map((set) => { const changed = updated.find((item) => item.id === set.id); return changed ? { ...set, ...changed, workoutDate: set.workoutDate } : set; })); setEditSet(null); router.refresh(); toast.success("Set diperbarui."); }} />}
    </>
  );
}

function ProgramDialog({ exercises, initialDays, onClose, onSaved, draftKey, initialVersion }: { draftKey: string; initialVersion: string | null; exercises: Exercise[]; initialDays: PersonalTrainingDay[]; onClose: () => void; onSaved: (days: PersonalTrainingDay[], exercises: Exercise[], version: string) => void }) {
  const draft = useProgramDraft(draftKey, initialDays, initialVersion, (days) => personalTrainingSchema.safeParse({ days }).success);
  const { value: days, setValue: setDays } = draft;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  function updateDay(index: number, update: Partial<PersonalTrainingDay>) { setDays((current) => current.map((day, i) => i === index ? { ...day, ...update } : day)); }
  async function close() {
    if (pending) return;
    if (JSON.stringify(days) !== JSON.stringify(initialDays) && !(await confirm({ description: "Tutup editor? Draft tetap tersimpan di perangkat ini, belum dikirim ke server.", confirmLabel: "Tutup editor" }))) return;
    onClose();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = personalTrainingSchema.safeParse({ days });
    if (!parsed.success) { setError("Lengkapi nama sesi, gerakan, target set (1–20), dan reps (1–200). Hindari gerakan duplikat dalam satu sesi."); return; }
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/coach/latihan/program", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...parsed.data, expectedVersion: draft.version }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan program.");
      draft.acknowledge(data.days, data.version);
      onSaved(data.days, data.exercises, data.version);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan program."); }
    finally { setPending(false); }
  }
  return (
    <Dialog title="Program pribadi saya" description="Buat hingga 7 sesi, misalnya Senin · Upper atau Sesi A. Hasil latihan tetap tersimpan saat program diubah." onClose={close} className="max-w-2xl">
      <DraftNotice status={draft.status} dirty={draft.dirty} onDownload={draft.download} onDiscard={() => { draft.clear(); window.location.reload(); }} />
      <form onSubmit={save} className="space-y-4" aria-busy={pending}>
        <fieldset disabled={pending || !draft.ready} className="space-y-4">
          {days.map((day, index) => <div key={index} className="space-y-3 rounded-xl border border-border p-3">
            <label className="block text-sm font-medium">Nama sesi {index + 1}<Input className="mt-1" maxLength={60} value={day.name} onChange={(event) => updateDay(index, { name: event.target.value })} placeholder="Contoh: Senin · Upper" required /></label>
            {day.slots.map((slot, slotIndex) => <div key={slotIndex} className="rounded-lg bg-surface-2 p-3">
              <label className="block text-sm font-medium">Gerakan {slotIndex + 1}<Select className="mt-1" value={slot.exerciseId} onChange={(event) => updateDay(index, { slots: day.slots.map((item, i) => i === slotIndex ? { ...item, exerciseId: event.target.value } : item) })} required><option value="" disabled>Pilih gerakan</option>{exercises.filter((exercise) => exercise.id === slot.exerciseId || !day.slots.some((item) => item.exerciseId === exercise.id)).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</Select></label>
              <label className="mt-3 block text-sm">Satuan<Select value={slot.unit} onChange={(event) => updateDay(index, { slots: day.slots.map((item, i) => i === slotIndex ? { ...item, unit: event.target.value as SetUnit } : item) })}>{Object.entries(UNIT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={slot.perSide} onChange={(event) => updateDay(index, { slots: day.slots.map((item, i) => i === slotIndex ? { ...item, perSide: event.target.checked } : item) })} />Tiap sisi</label>
              <div className="mt-3 grid grid-cols-2 gap-3">{(["sets", "reps"] as const).map((field) => <label key={field} className="text-sm font-medium">{field === "sets" ? "Target set" : `Target ${UNIT_LABEL[slot.unit]}`}<Input className="mt-1" type="number" inputMode="numeric" min={1} max={field === "sets" ? 20 : UNIT_MAX[slot.unit]} value={slot[field] || ""} onChange={(event) => updateDay(index, { slots: day.slots.map((item, i) => i === slotIndex ? { ...item, [field]: Number(event.target.value) } : item) })} required /></label>)}</div>
              <Button type="button" variant="ghost" className="mt-2 text-danger" onClick={() => updateDay(index, { slots: day.slots.filter((_, i) => i !== slotIndex) })}>Hapus gerakan {slotIndex + 1}</Button>
            </div>)}
            <div className="flex flex-wrap justify-between gap-2"><Button type="button" variant="secondary" disabled={day.slots.length >= 30 || exercises.every((exercise) => day.slots.some((slot) => slot.exerciseId === exercise.id))} onClick={() => updateDay(index, { slots: [...day.slots, { exerciseId: exercises.find((exercise) => !day.slots.some((slot) => slot.exerciseId === exercise.id))?.id ?? "", sets: 3, reps: 10, unit: "REPS", perSide: false }] })}>+ Gerakan</Button><Button type="button" variant="ghost" className="text-danger" onClick={() => setDays((current) => current.filter((_, i) => i !== index))}>Hapus sesi {index + 1}</Button></div>
          </div>)}
          <Button type="button" variant="secondary" disabled={days.length >= 7 || !exercises.length} onClick={() => setDays((current) => [...current, { name: "", slots: [{ exerciseId: exercises[0]?.id ?? "", sets: 3, reps: 10, unit: "REPS", perSide: false }] }])}>+ Tambah sesi</Button>
        </fieldset>
        {!days.length && <p className="text-sm text-muted">Tambahkan sesi untuk mulai menyusun program.</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-surface py-3"><Button type="button" variant="secondary" onClick={close} disabled={pending}>Batal</Button><Button type="submit" disabled={pending || !draft.ready}>{pending ? "Menyimpan…" : "Simpan program"}</Button></div>
      </form>
    </Dialog>
  );
}

function EditSetDialog({ set, onClose, onSaved }: { set: PersonalTrainingSet; onClose: () => void; onSaved: PersonalTrainingSetUpdate }) {
  const [weight, setWeight] = useState(String(set.weight));
  const [reps, setReps] = useState(String(set.reps));
  const [note, setNote] = useState(set.note ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const kg = parseLiftWeight(weight);
    if (kg === null || kg > 2000) { setError("Isi beban 0–2000 kg."); return; }
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/coach/latihan/sets/${set.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weight: kg, reps: Number(reps), note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memperbarui set.");
      onSaved(data.sets);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal memperbarui set."); }
    finally { setPending(false); }
  }
  return <Dialog title={`Edit ${set.exerciseName} · set ${set.setNumber}`} onClose={() => { if (!pending) onClose(); }}><form onSubmit={save} className="space-y-4" aria-busy={pending}><label className="block text-sm font-medium">Beban (kg)<Input className="mt-1" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} disabled={pending} required /></label><label className="block text-sm font-medium">Jumlah ({UNIT_LABEL[set.unit ?? "REPS"]}{set.perSide ? "/sisi" : ""})<Input className="mt-1" type="number" min={1} max={UNIT_MAX[set.unit ?? "REPS"]} step={1} value={reps} onChange={(event) => setReps(event.target.value)} disabled={pending} required /></label><label className="block text-sm font-medium">Catatan<Input className="mt-1" maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} disabled={pending} /></label>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan perubahan"}</Button></form></Dialog>;
}
type PersonalTrainingSetUpdate = (sets: Pick<PersonalTrainingSet, "id" | "weight" | "reps" | "note" | "isPR">[]) => void;
