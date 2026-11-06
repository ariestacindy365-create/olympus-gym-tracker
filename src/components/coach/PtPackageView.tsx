"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { MovementCombobox, type MovementOption } from "@/components/coach/MovementCombobox";
import { MemberSearch } from "@/components/coach/PtManager";
import { isClosedDay, scheduleLabel } from "@/lib/ptSession";

interface SlotDraft {
  slotLabel: string;
  movementId: string;
  sets: string;
  repTarget: string;
  note: string;
  roundScheme: string;
}

interface SessionDraft {
  number: number;
  title: string;
  /** YYYY-MM-DD it was trained, or null. */
  heldOn: string | null;
  /** Planned day (YYYY-MM-DD) and time ("07:00"), shown to the client; "" when not set. */
  scheduledOn: string;
  scheduledTime: string;
  slots: SlotDraft[];
}

const emptySlot = (label = ""): SlotDraft => ({ slotLabel: label, movementId: "", sets: "3", repTarget: "", note: "", roundScheme: "" });

// "A1" → "A2"; a slot after a blank label starts at A1.
function nextLabel(slots: SlotDraft[]): string {
  const last = slots.at(-1)?.slotLabel.trim().toUpperCase() ?? "";
  const m = last.match(/^([A-Z])(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : slots.length === 0 ? "A1" : "";
}

function formatDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
}

export function PtPackageView({
  packageId,
  title,
  coachName,
  mine,
  members,
  memberOptions,
  movements: initialMovements,
  sessions: initialSessions,
}: {
  packageId: string;
  title: string;
  coachName: string;
  mine: boolean;
  members: { id: string; name: string }[];
  memberOptions: { id: string; name: string; inPt: boolean }[];
  movements: MovementOption[];
  sessions: SessionDraft[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [movements, setMovements] = useState(initialMovements);
  const [sessions, setSessions] = useState(initialSessions);
  // What the server has; "Batal" goes back to it.
  const [saved, setSaved] = useState(initialSessions);
  const [editing, setEditing] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const movementName = (id: string) => movements.find((m) => m.id === id)?.name ?? "—";

  async function call(url: string, init: RequestInit, fallback: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? fallback);
        return null;
      }
      return data;
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function release(member: { id: string; name: string }) {
    const last = members.length === 1;
    const ok = await confirm({
      title: "Lepas dari PT",
      description: `${member.name} kembali jadi member kelas biasa${last ? ", dan paket PT ini selesai" : ""}. Riwayat latihannya tetap tersimpan.`,
      confirmLabel: "Lepas dari PT",
      danger: true,
    });
    if (!ok) return;
    const data = await call(`/api/coach/pt/${packageId}/members/${member.id}`, { method: "DELETE" }, "Gagal melepas member.");
    if (!data) return;
    if (data.ended) router.push("/coach/pt");
    else router.refresh();
  }

  async function addMember(memberId: string) {
    const data = await call(`/api/coach/pt/${packageId}/members`, { method: "POST", body: JSON.stringify({ memberId }) }, "Gagal menambah member.");
    if (data) {
      setAdding(false);
      router.refresh();
    }
  }

  function patch(number: number, change: (s: SessionDraft) => SessionDraft) {
    setSessions((list) => list.map((s) => (s.number === number ? change(s) : s)));
  }

  function newSession() {
    const prev = sessions.at(-1);
    const number = (prev?.number ?? 0) + 1;
    // Starts from the last session's movements: PT programs usually progress session to session.
    setSessions((list) => [...list, { number, title: "", heldOn: null, scheduledOn: "", scheduledTime: prev?.scheduledTime ?? "", slots: prev ? prev.slots.map((s) => ({ ...s })) : [emptySlot("A1")] }]);
    setEditing(number);
  }

  async function save(s: SessionDraft) {
    const slots = s.slots.filter((x) => x.movementId);
    const data = await call(
      `/api/coach/pt/${packageId}/sessions/${s.number}`,
      {
        method: "PUT",
        body: JSON.stringify({
          title: s.title.trim() || undefined,
          scheduledOn: s.scheduledOn || null,
          scheduledTime: s.scheduledOn && s.scheduledTime ? s.scheduledTime : null,
          slots: slots.map((x) => ({
            slotLabel: x.slotLabel.trim() || undefined,
            movementId: x.movementId,
            sets: Number(x.sets) > 0 ? Number(x.sets) : undefined,
            repTarget: x.repTarget.trim() || undefined,
            note: x.note.trim() || undefined,
            roundScheme: x.roundScheme.trim() || undefined,
          })),
        }),
      },
      "Gagal menyimpan sesi."
    );
    if (data) {
      const done = { ...s, slots };
      patch(s.number, () => done);
      setSaved((list) => (list.some((x) => x.number === s.number) ? list.map((x) => (x.number === s.number ? done : x)) : [...list, done]));
      setEditing(null);
      router.refresh();
    }
  }

  async function remove(s: SessionDraft) {
    if (!(await confirm({ description: `Hapus Sesi ${s.number}?`, confirmLabel: "Hapus", danger: true }))) return;
    const onServer = saved.some((x) => x.number === s.number);
    if (onServer && !(await call(`/api/coach/pt/${packageId}/sessions/${s.number}`, { method: "DELETE" }, "Gagal menghapus sesi."))) return;
    setSessions((list) => list.filter((x) => x.number !== s.number));
    setSaved((list) => list.filter((x) => x.number !== s.number));
    setEditing(null);
  }

  const nextUp = sessions.find((s) => !s.heldOn && s.slots.length > 0)?.number ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Paket PT {coachName}
          {members.length > 1 && " · Couple"}
        </p>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {!mine && <p className="text-sm text-muted">Hanya {coachName} yang bisa mengubah program paket ini.</p>}
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Klien</h2>
        <ul className="flex flex-col divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex min-h-11 items-center justify-between gap-2 py-1.5">
              <Link href={`/coach/members/${m.id}`} className="font-medium hover:text-accent">
                {m.name}
              </Link>
              {mine && (
                <button type="button" disabled={pending} onClick={() => release(m)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50">
                  Lepas dari PT
                </button>
              )}
            </li>
          ))}
        </ul>
        {mine &&
          (adding ? (
            <MemberSearch id="pt-add-member" members={memberOptions} selected={[]} onToggle={addMember} />
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="self-start text-sm font-semibold text-accent hover:underline">
              + Tambah orang ke paket ini (jadi couple/grup)
            </button>
          ))}
      </Card>

      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Program PT per sesi</h2>
          <span className="text-sm text-muted">{sessions.filter((s) => s.heldOn).length} sesi selesai</span>
        </div>
        {sessions.length === 0 && (
          <p className="rounded-xl border border-dashed border-border-strong bg-surface p-5 text-center text-sm text-muted">
            Belum ada sesi. {mine ? "Tulis Sesi 1 supaya klien bisa melihat dan mencatatnya." : ""}
          </p>
        )}
        {sessions.map((s) => {
          const open = editing === s.number;
          return (
            <Card key={s.number} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-bold">
                    Sesi {s.number}
                    {s.title && <span className="font-sans text-base font-medium text-muted"> · {s.title}</span>}
                  </p>
                  <p className={`text-xs font-semibold ${s.heldOn ? "text-success" : s.number === nextUp ? "text-accent" : "text-muted"}`}>
                    {s.heldOn ? `✓ Dilatih ${formatDay(s.heldOn)}` : s.number === nextUp ? "Sesi berikutnya" : "Belum dilatih"}
                  </p>
                  {s.scheduledOn && !s.heldOn && (
                    <p className="text-xs font-semibold text-foreground/80">📅 Jadwal {scheduleLabel(s.scheduledOn, s.scheduledTime)}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!open && s.slots.length > 0 && (
                    <Link href={`/coach/pt/${packageId}/catat/${s.number}`} className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-2">
                      Catat sesi{members.length > 1 ? " berdua" : ""}
                    </Link>
                  )}
                  {mine && !open && (
                    <Button type="button" variant="secondary" onClick={() => setEditing(s.number)}>
                      Ubah
                    </Button>
                  )}
                </div>
              </div>

              {open ? (
                <div className="flex flex-col gap-2">
                  <Input
                    id={`pt-session-${s.number}-title`}
                    value={s.title}
                    onChange={(e) => patch(s.number, (x) => ({ ...x, title: e.target.value }))}
                    placeholder="Fokus sesi (opsional), mis. Lower body"
                  />
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor={`pt-session-${s.number}-date`}>
                      Jadwal latihan
                      <input
                        id={`pt-session-${s.number}-date`}
                        type="date"
                        value={s.scheduledOn}
                        onChange={(e) => patch(s.number, (x) => ({ ...x, scheduledOn: e.target.value }))}
                        className="mt-1 block h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm font-normal normal-case tracking-normal text-foreground"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor={`pt-session-${s.number}-time`}>
                      Jam
                      <input
                        id={`pt-session-${s.number}-time`}
                        type="time"
                        value={s.scheduledTime}
                        disabled={!s.scheduledOn}
                        onChange={(e) => patch(s.number, (x) => ({ ...x, scheduledTime: e.target.value }))}
                        className="mt-1 block h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm font-normal normal-case tracking-normal text-foreground disabled:opacity-50"
                      />
                    </label>
                    {s.scheduledOn && (
                      <button type="button" onClick={() => patch(s.number, (x) => ({ ...x, scheduledOn: "", scheduledTime: "" }))} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-muted hover:text-foreground">
                        Hapus jadwal
                      </button>
                    )}
                    {s.scheduledOn && isClosedDay(s.scheduledOn) ? (
                      <p role="alert" className="basis-full text-xs font-semibold text-danger">Olympus tutup hari Minggu. Pilih hari lain.</p>
                    ) : (
                      <p className="basis-full text-xs text-muted">Klien melihat jadwal ini di HP-nya.</p>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-muted">
                          <th className="w-16 pb-1">Slot</th>
                          <th className="pb-1">Gerakan</th>
                          <th className="w-16 pb-1">Set</th>
                          <th className="w-28 pb-1">Target</th>
                          <th className="pb-1">Catatan</th>
                          <th className="w-10 pb-1" />
                        </tr>
                      </thead>
                      <tbody>
                        {s.slots.map((slot, k) => {
                          const set = (change: Partial<SlotDraft>) =>
                            patch(s.number, (x) => ({ ...x, slots: x.slots.map((y, i) => (i === k ? { ...y, ...change } : y)) }));
                          const cell = "w-full rounded border border-border bg-surface-2 px-2 py-1.5";
                          return (
                            <tr key={k} className="align-top">
                              <td className="py-1 pr-1"><input aria-label="Slot" className={cell} value={slot.slotLabel} onChange={(e) => set({ slotLabel: e.target.value.toUpperCase() })} /></td>
                              <td className="py-1 pr-1">
                                <MovementCombobox movements={movements} value={slot.movementId} onChange={(movementId) => set({ movementId })} onMovementCreated={(m) => setMovements((l) => [...l, m].sort((a, b) => a.name.localeCompare(b.name)))} />
                              </td>
                              <td className="py-1 pr-1"><input aria-label="Set" inputMode="numeric" className={cell} value={slot.sets} onChange={(e) => set({ sets: e.target.value.replace(/\D/g, "") })} /></td>
                              <td className="py-1 pr-1"><input aria-label="Target" className={cell} value={slot.repTarget} placeholder="10 / 30&quot;" onChange={(e) => set({ repTarget: e.target.value })} /></td>
                              <td className="py-1 pr-1"><input aria-label="Catatan" className={cell} value={slot.note} onChange={(e) => set({ note: e.target.value })} /></td>
                              <td className="py-1">
                                <button type="button" aria-label="Hapus gerakan" className="min-h-9 rounded px-2 text-danger hover:bg-danger/10" onClick={() => patch(s.number, (x) => ({ ...x, slots: x.slots.filter((_, i) => i !== k) }))}>✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="self-start text-sm font-semibold text-accent hover:underline" onClick={() => patch(s.number, (x) => ({ ...x, slots: [...x.slots, emptySlot(nextLabel(x.slots))] }))}>
                    + Gerakan
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={pending || !s.slots.some((x) => x.movementId) || (!!s.scheduledOn && isClosedDay(s.scheduledOn))} onClick={() => save(s)}>
                      {pending ? "Menyimpan…" : `Simpan Sesi ${s.number}`}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => { setSessions(saved); setEditing(null); }}>
                      Batal
                    </Button>
                    {!s.heldOn && s.number === sessions.at(-1)?.number && (
                      <button type="button" onClick={() => remove(s)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger/10">
                        Hapus sesi
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5 text-sm">
                  {s.slots.map((slot, k) => (
                    <li key={k}>
                      {slot.slotLabel && <span className="font-semibold text-accent">{slot.slotLabel}. </span>}
                      {movementName(slot.movementId)}
                      <span className="text-muted">
                        {slot.sets && ` · ${slot.sets} set`}
                        {slot.repTarget && ` × ${slot.repTarget}`}
                        {slot.note && ` (${slot.note})`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
        {mine && editing === null && (
          <Button type="button" variant="secondary" className="self-start" onClick={newSession}>
            + Tulis Sesi {(sessions.at(-1)?.number ?? 0) + 1}
          </Button>
        )}
      </section>
    </div>
  );
}
