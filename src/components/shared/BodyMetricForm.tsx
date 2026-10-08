"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parseWeightInput } from "@/lib/parseWeight";
import {
  OMRON_FIELDS,
  LEGACY_FIELDS,
  formatMetric,
  type BodyMetricEntry,
  type BodyMetricKey,
} from "@/lib/bodyMetricFields";
import {
  BodyMetricCelebrationModal,
  type BodyMetricCelebrationData,
  type BodyMetricWin,
} from "@/components/shared/BodyMetricCelebrationModal";
import {
  AchievementCelebrationModal,
  type AchievementCelebrationData,
  type UnlockedBadge,
} from "@/components/shared/AchievementCelebrationModal";

const ALL_FIELDS = [...OMRON_FIELDS, ...LEGACY_FIELDS];

// Compares the saved weigh-in with the one before it; every reading that
// moved in its "better" direction becomes a line on the celebration card.
function findWins(entries: BodyMetricEntry[], savedEntryId: string): BodyMetricWin[] {
  const sorted = [...entries].sort((a, b) => a.recordedDate.localeCompare(b.recordedDate));
  const index = sorted.findIndex((e) => e.id === savedEntryId);
  if (index <= 0) return [];
  const current = sorted[index];
  const previous = sorted[index - 1];

  const wins: BodyMetricWin[] = [];
  for (const field of ALL_FIELDS) {
    if (!field.better) continue;
    const now = current[field.key];
    const before = previous[field.key];
    if (now == null || before == null || now === before) continue;
    const improved = field.better === "lower" ? now < before : now > before;
    if (!improved) continue;
    const diff = Math.abs(now - before);
    const sign = now < before ? "-" : "+";
    const unit = field.unit === "%" || field.unit === "kg" ? field.unit : field.unit ? ` ${field.unit}` : "";
    wins.push({
      icon: now < before ? "⬇️" : "⬆️",
      label: `${field.label} ${now < before ? "Turun" : "Naik"}`,
      detail: `${sign}${Number(diff.toFixed(1))}${unit} → ${formatMetric(field, now)}`,
    });
  }
  return wins;
}

function todayInputValue() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface BodyMetricFormProps {
  basePath: string;
  memberName: string;
  title?: string;
  description?: string;
  /** Coach backfilling a weigh-in from a day the member didn't have their phone. */
  showDatePicker?: boolean;
}

export function BodyMetricForm({
  basePath,
  memberName,
  title = "Catat Hasil Timbang",
  description = "Salin angka dari layar timbangan Omron Karada Scan. Selain berat badan, semua opsional.",
  showDatePicker = false,
}: BodyMetricFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(todayInputValue);
  const [values, setValues] = useState<Partial<Record<BodyMetricKey, string>>>({});
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [celebration, setCelebration] = useState<BodyMetricCelebrationData | null>(null);
  const [achievementCelebration, setAchievementCelebration] = useState<AchievementCelebrationData | null>(null);
  const [queuedAchievements, setQueuedAchievements] = useState<UnlockedBadge[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (showDatePicker && !date) {
      setError("Pilih tanggal.");
      return;
    }
    const parsedValues: Partial<Record<BodyMetricKey, number>> = {};
    for (const field of OMRON_FIELDS) {
      const raw = values[field.key]?.trim() ?? "";
      if (!raw) {
        if (field.key === "weight") {
          setError("Isi berat badan yang valid.");
          return;
        }
        continue;
      }
      const num = parseWeightInput(raw);
      if (!num) {
        setError(`Isi ${field.label} yang valid.`);
        return;
      }
      parsedValues[field.key] = num;
    }

    setPending(true);
    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsedValues,
          note: note || undefined,
          recordedDate: showDatePicker ? date : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan data.");
        return;
      }
      const wins = findWins(data.entries, data.entry.id);
      // Coach backfilling a member's weigh-in shouldn't pop a "you unlocked
      // an emblem" celebration meant for the member themselves.
      const newAchievements: UnlockedBadge[] = showDatePicker ? [] : (data.newAchievements ?? []);
      if (wins.length > 0) {
        setCelebration({ memberName, wins });
        if (newAchievements.length > 0) setQueuedAchievements(newAchievements);
      } else if (newAchievements.length > 0) {
        setAchievementCelebration({ memberName, badges: newAchievements });
      }
      setValues({});
      setNote("");
      setDate(todayInputValue());
      setSaved(true);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted">{description}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {showDatePicker && (
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Tanggal Timbang
            </label>
            <Input
              type="date"
              value={date}
              max={todayInputValue()}
              onChange={(e) => setDate(e.target.value)}
              className="max-w-xs"
            />
          </div>
        )}
        <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
          {OMRON_FIELDS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`bm-${field.key}`}
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted"
              >
                {field.label}
                {field.unit && ` (${field.unit})`}
              </label>
              <Input
                id={`bm-${field.key}`}
                type="text"
                inputMode="decimal"
                placeholder={field.key === "weight" ? "wajib" : field.hint ?? "opsional"}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
            Catatan (opsional)
          </label>
          <Input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && !error && <p className="text-sm text-accent">Tersimpan.</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
      </form>

      {celebration && (
        <BodyMetricCelebrationModal
          data={celebration}
          onClose={() => {
            setCelebration(null);
            if (queuedAchievements) {
              setAchievementCelebration({ memberName, badges: queuedAchievements });
              setQueuedAchievements(null);
            }
          }}
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
