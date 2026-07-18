import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { epley1RM } from "@/lib/oneRepMax";
import { checkAndRecordPR } from "@/lib/pr";
import { Role } from "@/generated/prisma/client";

const HEADER_ALIASES = {
  date: ["tanggal", "date"],
  member: ["nama member", "member", "nama"],
  exercise: ["nama gerakan", "gerakan", "exercise"],
  weight: ["beban (kg)", "beban", "weight"],
  reps: ["repetisi", "reps"],
  note: ["catatan", "note", "notes"],
} as const;

type Field = keyof typeof HEADER_ALIASES;

const ID_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveHeaders(sampleRow: Record<string, unknown>): Partial<Record<Field, string>> {
  const keys = Object.keys(sampleRow);
  const resolved: Partial<Record<Field, string>> = {};
  for (const field of Object.keys(HEADER_ALIASES) as Field[]) {
    const aliases: readonly string[] = HEADER_ALIASES[field];
    const match = keys.find((k) => aliases.includes(normalizeHeader(k)));
    if (match) resolved[field] = match;
  }
  return resolved;
}

// Excel serial dates count days since 1899-12-30. Rounding to the nearest
// whole day before converting discards any spurious time-of-day fraction
// (seen in this data for same-day duplicate entries), and converting via
// Date.UTC-equivalent math avoids the server-timezone shift bug that comes
// from xlsx's own cellDates conversion.
function excelSerialToCalendarDate(serial: number): { year: number; month: number; day: number } {
  const wholeDay = Math.round(serial);
  const utcMs = (wholeDay - 25569) * 86400 * 1000;
  const d = new Date(utcMs);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function parseWorkoutDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const { year, month, day } = excelSerialToCalendarDate(value);
    return new Date(year, month - 1, day);
  }
  if (typeof value === "string") {
    const parts = value.trim().toLowerCase().split(/\s+/);
    if (parts.length === 3) {
      const day = Number(parts[0]);
      const month = ID_MONTHS[parts[1]];
      const year = Number(parts[2]);
      if (month && Number.isFinite(day) && Number.isFinite(year)) {
        return new Date(year, month - 1, day);
      }
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  return null;
}

interface ParsedRow {
  workoutDate: Date;
  memberName: string;
  exerciseName: string;
  weight: number;
  reps: number;
  note: string | null;
}

export async function POST(request: NextRequest) {
  const coach = await getCurrentUser();
  if (!coach || coach.role !== Role.COACH) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Pilih file .xlsx untuk diupload." }, { status: 400 });
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    // Deliberately NOT using cellDates: true — xlsx's built-in Excel-serial-to-Date
    // conversion interacts badly with this server's timezone for some serials
    // (whole-day serials were coming out ~7h short of UTC midnight, landing on
    // the previous calendar day once local date parts were read). Dates are
    // parsed manually from the raw serial number in parseWorkoutDate() instead.
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return NextResponse.json({ error: "File tidak bisa dibaca. Pastikan formatnya .xlsx." }, { status: 400 });
  }

  const sheetName =
    workbook.SheetNames.find((n) => n.toLowerCase() === "progress") ?? workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "File tidak punya sheet apapun." }, { status: 400 });
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  if (rawRows.length === 0) {
    return NextResponse.json({ error: `Sheet "${sheetName}" kosong.` }, { status: 400 });
  }

  const headers = resolveHeaders(rawRows[0]);
  const requiredFields: Field[] = ["date", "member", "exercise", "weight", "reps"];
  const missing = requiredFields.filter((f) => !headers[f]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Kolom berikut tidak ditemukan di sheet "${sheetName}": ${missing.join(", ")}.` },
      { status: 400 }
    );
  }

  const parsed: ParsedRow[] = [];
  for (const row of rawRows) {
    const memberRaw = row[headers.member!];
    const exerciseRaw = row[headers.exercise!];
    if (memberRaw == null || exerciseRaw == null) continue;

    const workoutDate = parseWorkoutDate(row[headers.date!]);
    const weight = Number(row[headers.weight!]);
    const reps = Number(row[headers.reps!]);
    if (!workoutDate || !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) {
      continue;
    }

    const noteRaw = headers.note ? row[headers.note] : null;
    parsed.push({
      workoutDate,
      memberName: String(memberRaw).trim(),
      exerciseName: String(exerciseRaw).trim(),
      weight,
      reps,
      note: noteRaw != null && String(noteRaw).trim() ? String(noteRaw).trim() : null,
    });
  }

  const members = await prisma.user.findMany({ where: { role: Role.MEMBER } });
  const memberByName = new Map(members.map((m) => [m.name.toLowerCase(), m]));

  const unmatchedCounts = new Map<string, number>();
  for (const row of parsed) {
    if (!memberByName.has(row.memberName.toLowerCase())) {
      unmatchedCounts.set(row.memberName, (unmatchedCounts.get(row.memberName) ?? 0) + 1);
    }
  }

  // Preserve every set from a session as its own row (setNumber assigned by
  // original sheet order, which is chronological within a day — i.e.
  // warm-up sets first). Day-groups are processed oldest-first, and sets
  // within a day are processed in setNumber order, so PR detection reflects
  // true chronological progression both across and within sessions.
  interface DayGroup {
    memberName: string;
    exerciseName: string;
    workoutDate: Date;
    rows: ParsedRow[];
  }
  const groups = new Map<string, DayGroup>();
  for (const row of parsed) {
    if (!memberByName.has(row.memberName.toLowerCase())) continue;
    const key = `${row.memberName.toLowerCase()}|${row.exerciseName.toLowerCase()}|${row.workoutDate.getTime()}`;
    let group = groups.get(key);
    if (!group) {
      group = { memberName: row.memberName, exerciseName: row.exerciseName, workoutDate: row.workoutDate, rows: [] };
      groups.set(key, group);
    }
    group.rows.push(row);
  }
  const orderedGroups = Array.from(groups.values()).sort(
    (a, b) => a.workoutDate.getTime() - b.workoutDate.getTime()
  );

  const exercises = await prisma.exercise.findMany();
  const exerciseByName = new Map(exercises.map((e) => [e.name.toLowerCase(), e]));

  let setsCreated = 0;
  let setsUpdated = 0;
  let prsDetected = 0;
  let exercisesCreated = 0;

  for (const group of orderedGroups) {
    const member = memberByName.get(group.memberName.toLowerCase())!;

    let exercise = exerciseByName.get(group.exerciseName.toLowerCase());
    if (!exercise) {
      exercise = await prisma.exercise.create({ data: { name: group.exerciseName } });
      exerciseByName.set(exercise.name.toLowerCase(), exercise);
      exercisesCreated++;
    }

    for (let i = 0; i < group.rows.length; i++) {
      const row = group.rows[i];
      const setNumber = i + 1;
      const estimated1RM = epley1RM(row.weight, row.reps);

      const existingBeforeWrite = await prisma.setEntry.findUnique({
        where: {
          memberId_exerciseId_workoutDate_setNumber: {
            memberId: member.id,
            exerciseId: exercise.id,
            workoutDate: row.workoutDate,
            setNumber,
          },
        },
      });

      // Re-importing the same file should be a true no-op for rows that
      // haven't changed — re-running PR detection against already-final
      // PersonalRecord state would incorrectly clear earlier PR flags, since
      // it'd be comparing each historical row against the *end* state instead
      // of the state as of that point in time.
      if (
        existingBeforeWrite &&
        existingBeforeWrite.weight === row.weight &&
        existingBeforeWrite.reps === row.reps &&
        existingBeforeWrite.note === row.note
      ) {
        setsUpdated++;
        continue;
      }

      const outcome = await prisma.$transaction(async (tx) => {
        const existing = existingBeforeWrite;

        const saved = await tx.setEntry.upsert({
          where: {
            memberId_exerciseId_workoutDate_setNumber: {
              memberId: member.id,
              exerciseId: exercise!.id,
              workoutDate: row.workoutDate,
              setNumber,
            },
          },
          create: {
            memberId: member.id,
            exerciseId: exercise!.id,
            workoutDate: row.workoutDate,
            setNumber,
            weight: row.weight,
            reps: row.reps,
            estimated1RM,
            note: row.note,
          },
          update: { weight: row.weight, reps: row.reps, estimated1RM, note: row.note },
        });

        const isPR = await checkAndRecordPR(tx, {
          memberId: member.id,
          exerciseId: exercise!.id,
          weight: row.weight,
          reps: row.reps,
          estimated1RM,
          setEntryId: saved.id,
        });

        if (isPR !== saved.isPR) {
          await tx.setEntry.update({ where: { id: saved.id }, data: { isPR } });
        }

        return { wasExisting: !!existing, isPR };
      });

      if (outcome.wasExisting) setsUpdated++;
      else setsCreated++;
      if (outcome.isPR) prsDetected++;
    }
  }

  return NextResponse.json({
    totalRows: parsed.length,
    groupsProcessed: orderedGroups.length,
    setsCreated,
    setsUpdated,
    prsDetected,
    exercisesCreated,
    unmatchedMembers: Array.from(unmatchedCounts.entries()).map(([name, rowCount]) => ({ name, rowCount })),
  });
}
