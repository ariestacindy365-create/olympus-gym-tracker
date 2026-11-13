import { z } from "zod";
import { UNIT_MAX, type SetUnit } from "@/lib/setUnits";

// Some phones (notably Indonesian keyboard layouts) type "," instead of "."
// for decimals on a numeric input, which a plain z.number() rejects outright.
// Normalize before validating so "82,5" and "82.5" both work.
function flexibleNumber(max: number, { allowZero = false } = {}) {
  return z.preprocess((val) => {
    if (typeof val === "string") {
      const normalized = val.trim().replace(",", ".");
      const num = Number(normalized);
      return Number.isFinite(num) ? num : val;
    }
    return val;
  }, (allowZero ? z.number().nonnegative() : z.number().positive()).max(max));
}

const flexibleWeight = flexibleNumber(2000);
// Weight lifted in a set: 0 = bodyweight / no load.
const liftWeight = flexibleNumber(2000, { allowZero: true });

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  pin: z.string().regex(/^\d{4}$/, { error: "PIN must be exactly 4 digits." }),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name." }).max(80),
  email: z.email({ error: "Enter a valid email address." }),
  pin: z.string().regex(/^\d{4}$/, { error: "PIN must be exactly 4 digits." }),
});

export const registerAdminSchema = z.object({
  name: z.string().trim().min(2, { error: "Isi nama Anda." }).max(80),
  email: z.email({ error: "Masukkan email yang valid." }),
  pin: z.string().regex(/^\d{4}$/, { error: "PIN harus 4 digit angka." }),
  inviteCode: z.string().trim().min(1, { error: "Isi kode registrasi admin." }),
});

const SET_UNITS = ["REPS", "SECONDS", "LAPS", "METERS", "CALORIES"] as const;
/** reps = the amount in `unit`; each unit has its own upper limit. */
export function amountFitsUnit(amount: number, unit: SetUnit) {
  return amount <= UNIT_MAX[unit];
}

export const setEntrySchema = z
  .object({
    exerciseId: z.string().min(1),
    setNumber: z.number().int().positive().optional(),
    weight: liftWeight,
    reps: z.number().int().positive().max(20000),
    unit: z.enum(SET_UNITS).default("REPS"),
    perSide: z.boolean().default(false),
    note: z.string().trim().max(280).optional(),
    // "YYYY-MM-DD" when filling in a past day; the route checks the range.
    date: z.string().max(10).optional(),
    // When ✓ was tapped, for a set that waited on the phone for signal.
    loggedAt: z.iso.datetime().optional(),
    // A set from a PT session: the first one marks the session as trained that day.
    ptSessionId: z.string().min(1).max(40).optional(),
  })
  .refine((d) => amountFitsUnit(d.reps, d.unit), { path: ["reps"] });

// Edits keep the set's unit; the route checks the amount against it.
export const editSetEntrySchema = z.object({
  weight: liftWeight,
  reps: z.number().int().positive().max(20000),
  note: z.string().trim().max(280).optional(),
});

export const coachEditSetEntrySchema = z.object({
  weight: liftWeight,
  reps: z.number().int().positive().max(20000),
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
  roundScheme: z.string().trim().max(60).optional(),
});

export const programDaySchema = z.object({
  dayLabel: z.string().trim().min(1, { error: "Isi nama hari." }).max(20),
  focusLabel: z.string().trim().max(40).optional(),
  slots: z.array(programSlotSchema).max(30),
});

export const saveProgramWeekSchema = z.object({
  days: z.array(programDaySchema).max(7),
});

// Personal training: a package for 1+ members, and one numbered session's program.
export const createPtPackageSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1).max(6),
  name: z.string().trim().max(60).optional(),
});

export const savePtSessionSchema = z.object({
  title: z.string().trim().max(60).optional(),
  // The planned day and time, shown to the client; null clears it.
  scheduledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  slots: z.array(programSlotSchema.omit({ targetWeight: true })).max(30),
});

export const bodyMetricSchema = z.object({
  weight: flexibleWeight,
  bodyFatPercent: flexibleNumber(100).optional(),
  visceralFat: flexibleNumber(60).optional(),
  // Omron Karada Scan
  skeletalMusclePercent: flexibleNumber(100).optional(),
  bodyAge: flexibleNumber(150).optional(),
  // Legacy InBody reading; the current form no longer sends it.
  skeletalMuscleMass: flexibleWeight.optional(),
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
  // Omitted = leave as is; null = clear.
  source: z.enum(["INSTAGRAM", "TIKTOK", "FACEBOOK", "WALK_IN", "REFERRAL", "LAINNYA"]).nullable().optional(),
});

export const editLeadSchema = createLeadSchema;

export const updateLeadStatusSchema = z.object({
  status: z.enum(["DM", "TRIAL", "MEMBER", "RETENSI", "LOST"]),
});

export const completeFollowUpSchema = z.object({
  outcome: z.enum(["CONVERTED", "STILL_FOLLOWING", "LOST", "FOLLOWED_UP"]),
  note: z.string().trim().max(280).optional(),
});

export const createFollowUpSchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tanggal tidak valid." }),
  note: z.string().trim().max(280).optional(),
});

// A "data:image/...;base64,..." string, resized/compressed client-side
// before upload — cap generous enough for a compressed photo, small
// enough to keep a rogue payload out of the request.
const proofImageSchema = z
  .string()
  .startsWith("data:image/", { error: "Format bukti tidak valid." })
  .max(3_000_000, { error: "Ukuran bukti terlalu besar." })
  .optional();

export const createPaymentSchema = z.object({
  packageName: z.string().trim().min(1, { error: "Isi nama paket." }).max(80),
  amount: z.number().int().positive({ error: "Nominal harus lebih dari 0." }).max(100_000_000),
  paymentMethod: z.enum(["QRIS", "TRANSFER", "KARTU_KREDIT", "DEBIT", "FITQUARTER", "TUNAI"]),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tanggal tidak valid." }).optional(),
  durationDays: z.number().int().positive({ error: "Durasi harus lebih dari 0." }).max(3650).optional(),
  proofImage: proofImageSchema,
  note: z.string().trim().max(280).optional(),
});

export const createExpenseSchema = z.object({
  category: z.enum(["SEWA", "GAJI", "LISTRIK_AIR", "ALAT", "MARKETING", "MAINTENANCE", "LAINNYA"]),
  amount: z.number().int().positive({ error: "Nominal harus lebih dari 0." }).max(1_000_000_000),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tanggal tidak valid." }).optional(),
  proofImage: proofImageSchema,
  description: z.string().trim().max(280).optional(),
});

export const updateTargetSchema = z.object({
  targetCapture: z.number().int().min(0).max(200),
  targetFollowup: z.number().int().min(0).max(200),
});

export const createPackageSchema = z.object({
  name: z.string().trim().min(1, { error: "Isi nama paket." }).max(80),
  price: z.number().int().positive({ error: "Harga harus lebih dari 0." }).max(100_000_000),
  durationDays: z.number().int().positive({ error: "Durasi harus lebih dari 0." }).max(3650).optional(),
  credits: z.number().int().positive({ error: "Jumlah sesi harus lebih dari 0." }).max(500).nullable().optional(),
  showInApp: z.boolean().optional(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1, { error: "Isi nama produk." }).max(80),
  barcode: z.string().trim().min(1, { error: "Isi barcode." }).max(80),
  price: z.number().int().positive({ error: "Harga harus lebih dari 0." }).max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, { error: "Isi nama produk." }).max(80).optional(),
  barcode: z.string().trim().min(1, { error: "Isi barcode." }).max(80).optional(),
  price: z.number().int().positive({ error: "Harga harus lebih dari 0." }).max(100_000_000).optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(100_000).optional(),
  isActive: z.boolean().optional(),
});

export const scanSaleSchema = z.object({
  barcode: z.string().trim().min(1, { error: "Barcode kosong." }).max(80),
  paymentMethod: z.enum(["QRIS", "TRANSFER", "KARTU_KREDIT", "DEBIT", "FITQUARTER", "TUNAI"]),
  // Set when the admin already saw the "recently scanned" warning and chose
  // to record it as a sale anyway (e.g. a second, genuinely separate unit
  // of the same product) — skips the duplicate check for this one request.
  confirmDuplicate: z.boolean().optional(),
  note: z.string().trim().max(280).optional(),
});

export const restockSchema = z.object({
  quantity: z.number().int().positive({ error: "Jumlah harus lebih dari 0." }).max(100_000),
});

export const updatePackageSchema = z.object({
  name: z.string().trim().min(1, { error: "Isi nama paket." }).max(80).optional(),
  price: z.number().int().positive({ error: "Harga harus lebih dari 0." }).max(100_000_000).optional(),
  durationDays: z.number().int().positive({ error: "Durasi harus lebih dari 0." }).max(3650).nullable().optional(),
  credits: z.number().int().positive({ error: "Jumlah sesi harus lebih dari 0." }).max(500).nullable().optional(),
  showInApp: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const waNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{9,20}$/, { error: "Nomor WhatsApp tidak valid." });

// A member picks a package; they get the exact amount to pay (with a unique code).
export const createMembershipOrderSchema = z.object({
  packageId: z.string().min(1),
});

// Then they send the proof of payment.
export const submitMembershipPaymentSchema = z.object({
  paymentMethod: z.enum(["QRIS", "TRANSFER"]),
  waNumber: waNumberSchema,
  senderName: z.string().trim().min(2, { error: "Isi nama pemilik rekening / akun pengirim." }).max(80),
  proofImage: z
    .string()
    .startsWith("data:image/", { error: "Upload bukti pembayaran dulu." })
    .max(3_000_000, { error: "Ukuran bukti terlalu besar." }),
});

export const reviewMembershipOrderSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), verified: z.literal(true, { error: "Centang dulu bahwa uangnya sudah masuk." }) }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(1, { error: "Tulis alasannya." }).max(200) }),
]);

// Admin adds a membership for someone who paid at the front desk.
export const createMembershipSchema = z.object({
  userId: z.string().min(1),
  packageId: z.string().min(1),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tanggal tidak valid." }).optional(),
});

export const paymentInfoSchema = z.object({
  bankName: z.string().trim().max(60),
  accountNumber: z.string().trim().max(40),
  accountName: z.string().trim().max(80),
  qrisImage: z
    .string()
    .startsWith("data:image/", { error: "Format gambar QRIS tidak valid." })
    .max(1_500_000, { error: "Gambar QRIS terlalu besar." })
    .nullable()
    .optional(),
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
