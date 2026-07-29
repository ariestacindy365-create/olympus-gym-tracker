import { z } from "zod";

// Some phones (notably Indonesian keyboard layouts) type "," instead of "."
// for decimals on a numeric input, which a plain z.number() rejects outright.
// Normalize before validating so "82,5" and "82.5" both work.
function flexibleNumber(max: number) {
  return z.preprocess((val) => {
    if (typeof val === "string") {
      const normalized = val.trim().replace(",", ".");
      const num = Number(normalized);
      return Number.isFinite(num) ? num : val;
    }
    return val;
  }, z.number().positive().max(max));
}

const flexibleWeight = flexibleNumber(2000);

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  pin: z.string().regex(/^\d{4}$/, { error: "PIN must be exactly 4 digits." }),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name." }).max(80),
  email: z.email({ error: "Enter a valid email address." }),
  pin: z.string().regex(/^\d{4}$/, { error: "PIN must be exactly 4 digits." }),
});

export const setEntrySchema = z.object({
  exerciseId: z.string().min(1),
  setNumber: z.number().int().positive().optional(),
  weight: flexibleWeight,
  reps: z.number().int().positive().max(200),
  note: z.string().trim().max(280).optional(),
});

export const editSetEntrySchema = z.object({
  weight: flexibleWeight,
  reps: z.number().int().positive().max(200),
  note: z.string().trim().max(280).optional(),
});

export const coachEditSetEntrySchema = z.object({
  weight: flexibleWeight,
  reps: z.number().int().positive().max(200),
  note: z.string().trim().max(280).optional(),
});

export const dailyWorkoutSchema = z
  .object({
    exerciseId: z.string().min(1).optional(),
    newExerciseName: z.string().trim().min(2).max(80).optional(),
  })
  .refine((data) => data.exerciseId || data.newExerciseName, {
    error: "Pick an exercise or add a new one.",
  });

export const createMemberSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  name: z.string().trim().max(80).optional(),
});

export const editMemberNameSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter a name." }).max(80),
});

export const createExerciseSchema = z.object({
  name: z.string().trim().min(2, { error: "Nama gerakan minimal 2 karakter." }).max(80),
});

export const editExerciseSchema = createExerciseSchema;

export const changeEmailSchema = z.object({
  email: z.email({ error: "Masukkan email yang valid." }),
});

export const changePinSchema = z.object({
  currentPin: z.string().regex(/^\d{4}$/, { error: "PIN harus 4 digit angka." }),
  newPin: z.string().regex(/^\d{4}$/, { error: "PIN baru harus 4 digit angka." }),
});

export const programSlotSchema = z.object({
  slotLabel: z.string().trim().max(20).optional(),
  movementId: z.string().min(1),
  sets: z.number().int().positive().max(20).optional(),
  repTarget: z.string().trim().max(40).optional(),
  targetWeight: z.number().positive().max(2000).optional(),
  note: z.string().trim().max(280).optional(),
});

export const programDaySchema = z.object({
  dayLabel: z.string().trim().min(1, { error: "Isi nama hari." }).max(20),
  focusLabel: z.string().trim().max(40).optional(),
  slots: z.array(programSlotSchema).max(30),
});

export const saveProgramWeekSchema = z.object({
  days: z.array(programDaySchema).max(7),
});

export const bodyMetricSchema = z.object({
  weight: flexibleWeight,
  bodyFatPercent: flexibleNumber(100).optional(),
  skeletalMuscleMass: flexibleWeight.optional(),
  visceralFat: flexibleNumber(60).optional(),
  note: z.string().trim().max(280).optional(),
  // Coach backfilling a weigh-in from a day the member didn't have their
  // phone — defaults to today when omitted (the member's own form never
  // sends this).
  recordedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tanggal tidak valid." }).optional(),
});

export const createLeadSchema = z.object({
  waNumber: z
    .string()
    .trim()
    .min(8, { error: "Nomor WA minimal 8 digit." })
    .max(20)
    .regex(/^[\d+\s-]+$/, { error: "Nomor WA hanya boleh angka." }),
  name: z.string().trim().min(1, { error: "Isi nama calon klien." }).max(80),
});

export const editLeadSchema = createLeadSchema;

export const addReplySchema = z.object({
  count: z.number().int().min(1).max(20).optional().default(1),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(["DM", "TRIAL", "MEMBER", "RETENSI", "LOST"]),
});

export const completeFollowUpSchema = z.object({
  outcome: z.enum(["CONVERTED", "STILL_FOLLOWING", "LOST"]),
  note: z.string().trim().max(280).optional(),
});

export const updateTargetSchema = z.object({
  targetCapture: z.number().int().min(0).max(200),
  targetFollowup: z.number().int().min(0).max(200),
});

export const createMovementSchema = z.object({
  name: z.string().trim().min(2, { error: "Nama gerakan minimal 2 karakter." }).max(120),
  primaryMuscle: z.string().trim().min(1, { error: "Isi otot primer." }).max(60),
  secondaryMuscle: z.string().trim().max(120).optional(),
  category: z.string().trim().min(1, { error: "Isi kategori." }).max(60),
  equipment: z.string().trim().min(1, { error: "Isi alat." }).max(60),
  repRangeHint: z.string().trim().max(40).optional(),
  setRangeHint: z.string().trim().max(20).optional(),
});
