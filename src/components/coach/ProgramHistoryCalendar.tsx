"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";

interface SnapshotSlot {
  slotLabel: string | null;
  movementName: string;
  sets: number | null;
  repTarget: string | null;
  targetWeight: number | null;
  note: string | null;
  roundScheme: string | null;
}

interface SnapshotDay {
  dayLabel: string;
  focusLabel: string | null;
  slots: SnapshotSlot[];
}

export interface Snapshot {
  id: string;
  weekNumber: number;
  createdAt: string;
  coach: { name: string };
  data: { days: SnapshotDay[] };
}

interface ProgramHistoryCalendarProps {
  initialYear: number;
  initialMonth: number; // 0-11
  initialSnapshots: Snapshot[];
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const WEEKDAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function snapshotDateKey(iso: string): string {
  const d = new Date(iso);
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function ProgramHistoryCalendar({ initialYear, initialMonth, initialSnapshots }: ProgramHistoryCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const snapshotsByDate = useMemo(() => {
    const map = new Map<string, Snapshot[]>();
    for (const s of snapshots) {
      const key = snapshotDateKey(s.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [snapshots]);

  const cells = useMemo(() => {
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const result: { day: number | null; key: string | null }[] = [];
    for (let i = 0; i < total; i++) {
      const day = i - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) {
        result.push({ day: null, key: null });
      } else {
        result.push({ day, key: dateKey(year, month, day) });
      }
    }
    return result;
  }, [year, month]);

  function goToMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDate(null);
    setExpandedId(null);
    setLoading(true);
    const monthParam = `${newYear}-${String(newMonth + 1).padStart(2, "0")}`;
    fetch(`/api/coach/programs/riwayat?month=${monthParam}`)
      .then((r) => r.json())
      .then((json) => setSnapshots(json.snapshots ?? []))
      .finally(() => setLoading(false));
  }

  const selectedSnapshots = selectedDate ? (snapshotsByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="rounded px-2 py-1 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-foreground"
          >
            &larr;
          </button>
          <p className="font-display text-base font-bold uppercase tracking-wide">
            {MONTH_NAMES[month]} {year}
          </p>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="rounded px-2 py-1 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-foreground"
          >
            &rarr;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted">
          {WEEKDAY_NAMES.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className={`grid grid-cols-7 gap-1 ${loading ? "opacity-50" : ""}`}>
          {cells.map((cell, i) => {
            if (cell.day === null) return <div key={i} />;
            const entries = snapshotsByDate.get(cell.key!) ?? [];
            const hasEntries = entries.length > 0;
            const isSelected = selectedDate === cell.key;
            return (
              <button
                key={i}
                type="button"
                disabled={!hasEntries}
                onClick={() => {
                  setSelectedDate(cell.key);
                  setExpandedId(entries.length === 1 ? entries[0].id : null);
                }}
                className={`flex flex-col items-center gap-0.5 rounded-md py-2 text-sm ${
                  hasEntries
                    ? isSelected
                      ? "bg-accent text-background font-semibold"
                      : "bg-surface-2 font-semibold text-foreground hover:brightness-110"
                    : "text-muted"
                }`}
              >
                <span>{cell.day}</span>
                {hasEntries && (
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-background" : "bg-accent"}`} />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDate && (
        <Card className="p-4">
          <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-accent">
            Riwayat {selectedDate.split("-").reverse().join("-")}
          </p>
          <div className="flex flex-col gap-3">
            {selectedSnapshots.map((snap) => (
              <div key={snap.id} className="rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === snap.id ? null : snap.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold hover:bg-surface-2"
                >
                  <span>
                    Minggu {snap.weekNumber} &mdash; disimpan{" "}
                    {new Date(snap.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{" "}
                    oleh {snap.coach.name}
                  </span>
                  <span className="text-muted">{expandedId === snap.id ? "▲" : "▼"}</span>
                </button>
                {expandedId === snap.id && (
                  <div className="flex flex-col gap-3 border-t border-border p-3">
                    {snap.data.days.map((day, di) => (
                      <div key={di}>
                        <p className="text-sm font-bold uppercase text-foreground">
                          {day.dayLabel}
                          {day.focusLabel && <span className="font-normal"> &mdash; {day.focusLabel}</span>}
                        </p>
                        <div className="mt-1 flex flex-col gap-0.5">
                          {day.slots.length === 0 && <p className="text-sm text-muted">(belum ada gerakan)</p>}
                          {day.slots.map((slot, si) => {
                            const setsReps = [slot.sets, slot.repTarget].filter(Boolean).join("x");
                            return (
                              <p key={si} className="text-sm">
                                {slot.slotLabel && <span className="font-semibold">{slot.slotLabel}. </span>}
                                <span>{slot.movementName}</span>
                                {setsReps && <span className="text-muted"> &mdash; {setsReps}</span>}
                                {slot.targetWeight != null && <span className="text-muted"> @{slot.targetWeight}kg</span>}
                                {slot.note && <span className="italic text-muted"> ({slot.note})</span>}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {!selectedDate && (
        <p className="text-sm text-muted">Klik tanggal yang ada titiknya untuk lihat program yang disimpan hari itu.</p>
      )}
    </div>
  );
}
