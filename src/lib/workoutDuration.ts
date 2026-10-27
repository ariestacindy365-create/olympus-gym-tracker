import { z } from "zod";

export const DEFAULT_WORKOUT_MINUTES = 60;
export const WORKOUT_DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120] as const;
export const workoutDurationSchema = z.number().int().min(10).max(120).default(DEFAULT_WORKOUT_MINUTES);
