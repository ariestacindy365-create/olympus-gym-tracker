import { z } from "zod";

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
  weight: z.number().positive().max(2000),
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
