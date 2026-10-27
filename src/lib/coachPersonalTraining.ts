import { z } from "zod";

export const personalTrainingSlotSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(200),
});

export const personalTrainingSchema = z.object({
  days: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    slots: z.array(personalTrainingSlotSchema).min(1).max(30)
      .refine((slots) => new Set(slots.map((slot) => slot.exerciseId)).size === slots.length, "Gerakan dalam satu hari tidak boleh duplikat."),
  })).max(7),
});

export type PersonalTrainingDay = z.infer<typeof personalTrainingSchema>["days"][number];

export interface PersonalTrainingSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  workoutDate: string;
  setNumber: number;
  weight: number;
  reps: number;
  note: string | null;
  isPR: boolean;
}
