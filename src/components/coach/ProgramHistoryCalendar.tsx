"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface DaySlot {
  slotLabel: string | null;
  movementName: string;
  sets: number | null;
  repTarget: string | null;
  targetWeight: number | null;
  note: string | null;
  roundScheme: string | null;
}

interface DayEntry {
  date: string; // YYYY-MM-DD
  weekNumber: number;
  /** This week runs a different Minggu than the rotation (one-off). */
  overridden: boolean;
  day: { dayLabel: string; focusLabel: string | null; slots: DaySlot[] } | null;
}

interface Rotation {
  anchorMonday: string;
  anchorWeekNumber: number;
}

interface CurrentWeek {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string;
  weekNumber: number;
  rotationWeekNumber: number;
  overridden: boolean;
}

interface ProgramHistoryCalendarProps {
  initialYear: number;
  initialMonth: number; // 0-11
  initialDays: DayEntry[];
  initialRotation: Rotation;
  initialCurrentWeek: CurrentWeek;
}

function formatShort(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
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

export function ProgramHistoryCalendar({
  initialYear,
  initialMonth,
  initialDays,
  initialRotation,
  initialCurrentWeek,
}: ProgramHistoryCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState(initialDays);
  const [rotation, setRotation] = useState(initialRotation);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showRotationForm, setShowRotationForm] = useState(false);
  const [rotationDate, setRotationDate] = useState("");
  const [rotationWeek, setRotationWeek] = useState("1");
  const [rotationSaving, setRotationSaving] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(initialCurrentWeek);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const daysByDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const cells = useMemo(() => {
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const result: { day: number | null; key: string | null }[] = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - firstWeekday + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        result.push({ day: null, key: null });
      } else {
        result.push({ day: dayNum, key: `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` });
      }
    }
    return result;
  }, [year, month]);

  async function loadMonth(newYear: number, newMonth: number) {
    setLoading(true);
    setSelectedDate(null);
    const monthParam = `${newYear}-${String(newMonth + 1).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/coach/programs/riwayat?month=${monthParam}`);
      const json = await res.json();
      setDays(json.days ?? []);
      if (json.rotation) setRotation(json.rotation);
      if (json.currentWeek) setCurrentWeek(json.currentWeek);
    } finally {
      setLoading(false);
    }
  }

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
    void loadMonth(newYear, newMonth);
  }

  async function saveRotation() {
    if (!rotationDate) return;
    setRotationSaving(true);
    try {
      const res = await fetch("/api/coach/programs/rotation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: rotationDate, weekNumber: Number(rotationWeek) }),
      });
      if (res.ok) {
        setShowRotationForm(false);
        await loadMonth(year, month);
      }
    } finally {
      setRotationSaving(false);
    }
  }

  // Only this week can be switched; the rotation itself stays as is.
  async function setThisWeek(weekNumber: number | null) {
    setOverrideSaving(true);
    setOverrideError(null);
    try {
      const res = await fetch("/api/coach/programs/override", {
        method: weekNumber === null ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: weekNumber === null ? undefined : JSON.stringify({ weekNumber }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setOverrideError(json.error ?? "Gagal menyimpan.");
        return;
      }
      await loadMonth(year, month);
    } finally {
      setOverrideSaving(false);
    }
  }

  const selectedEntry = selectedDate ? daysByDate.get(selectedDate) : null;
  const weekRange = `${formatShort(currentWeek.weekStart)}–${formatShort(currentWeek.weekEnd)}`;

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={`flex flex-wrap items-center justify-between gap-3 p-4 ${
          currentWeek.overridden ? "border-amber-400/50 bg-amber-400/5" : ""
        }`}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Minggu ini · {weekRange}</p>
          <p className="font-display text-lg font-bold">
            Program Minggu {currentWeek.weekNumber}
            {currentWeek.overridden && (
              <span className="ml-2 align-middle text-xs font-semibold text-amber-500">
                diganti khusus minggu ini (jadwal: Minggu {currentWeek.rotationWeekNumber})
              </span>
            )}
          </p>
        </div>
        {currentWeek.overridden && (
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={overrideSaving}
            onClick={() => setThisWeek(null)}
          >
            {overrideSaving ? "..." : `Kembalikan ke jadwal (Minggu ${currentWeek.rotationWeekNumber})`}
          </Button>
        )}
        {overrideError && <p className="w-full text-sm text-danger">{overrideError}</p>}
      </Card>

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
            const entry = daysByDate.get(cell.key!);
            const hasProgram = !!entry?.day;
            const isSelected = selectedDate === cell.key;
            return (
              <button
                key={i}
                type="button"
                disabled={!hasProgram}
                onClick={() => setSelectedDate(cell.key)}
                className={`flex flex-col items-center gap-0.5 rounded-md py-2 text-sm ${
                  hasProgram
                    ? isSelected
                      ? "bg-accent text-background font-semibold"
                      : "bg-surface-2 font-semibold text-foreground hover:brightness-110"
                    : "text-muted"
                }`}
              >
                <span>{cell.day}</span>
                {entry && (
                  <span
                    className={`text-[10px] leading-none ${entry.overridden ? "font-bold text-amber-500" : "opacity-70"}`}
                    title={entry.overridden ? "Diganti khusus minggu ini" : undefined}
                  >
                    M{entry.weekNumber}
                    {entry.overridden && "*"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedEntry?.day && (
        <Card className="p-4">
          <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-accent">
            {selectedDate!.split("-").reverse().join("-")} &mdash; Minggu {selectedEntry.weekNumber} &mdash;{" "}
            {selectedEntry.day.dayLabel}
            {selectedEntry.day.focusLabel && <span className="text-foreground"> &mdash; {selectedEntry.day.focusLabel}</span>}
          </p>
          {selectedEntry.weekNumber !== currentWeek.weekNumber && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-accent/10 px-3 py-2">
              <p className="flex-1 text-xs text-muted">
                Mau minggu ini ({weekRange}) pakai Minggu {selectedEntry.weekNumber}? Hanya minggu ini yang berubah,
                minggu depan kembali ke jadwal.
              </p>
              <Button
                className="px-3 py-1.5 text-xs"
                disabled={overrideSaving}
                onClick={() => setThisWeek(selectedEntry.weekNumber)}
              >
                {overrideSaving ? "Menyimpan..." : `Pakai Minggu ${selectedEntry.weekNumber} untuk minggu ini`}
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {selectedEntry.day.slots.length === 0 && <p className="text-sm text-muted">(belum ada gerakan)</p>}
            {selectedEntry.day.slots.map((slot, si) => {
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
        </Card>
      )}

      {!selectedDate && (
        <p className="text-sm text-muted">
          Klik tanggal yang ada tulisannya untuk lihat program di hari itu. Angka kecil di bawah tanggal (mis. &quot;M2&quot;)
          menunjukkan Minggu ke berapa yang berlaku; tanda * berarti minggu itu diganti khusus. Dari tanggal mana pun kamu
          bisa memakai program Minggu-nya untuk minggu ini.
        </p>
      )}

      <Card className="p-4">
        <button
          type="button"
          onClick={() => setShowRotationForm(!showRotationForm)}
          className="text-xs font-semibold text-muted hover:text-accent hover:underline"
        >
          {showRotationForm ? "Tutup" : "⚙️ Rotasinya meleset? Atur ulang di sini"}
        </button>
        {showRotationForm && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Tanggal</label>
              <Input type="date" value={rotationDate} onChange={(e) => setRotationDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Minggu ke</label>
              <select
                value={rotationWeek}
                onChange={(e) => setRotationWeek(e.target.value)}
                className="rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="1">Minggu 1</option>
                <option value="2">Minggu 2</option>
                <option value="3">Minggu 3</option>
                <option value="4">Minggu 4</option>
              </select>
            </div>
            <Button onClick={saveRotation} disabled={!rotationDate || rotationSaving} className="px-4">
              {rotationSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          Sekarang: minggu yang dimulai {new Date(rotation.anchorMonday).toLocaleDateString("id-ID")} dianggap Minggu{" "}
          {rotation.anchorWeekNumber}, lalu berputar otomatis 1→2→3→4 tiap minggu.
        </p>
      </Card>
    </div>
  );
}
