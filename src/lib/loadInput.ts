// Client-safe: which program movements members log with a weight. TABATA
// finishers and bodyweight / banded / no-load cardio moves are just done,
// not logged; anything with a load implement stays a fill-in row.

// A load implement in the name always means "log it" ("Wall Sit with DB
// Front Hold", "Weighted Stair Run", "Ball Slam").
const LOADED = /\b(bb|db|kb|barbell|dumbbell|kettlebell|plate|cable|machine|weighted|sandbag|med(icine)?\s*ball|wall\s*ball|ball\s*slam|landmine|sled|trap\s*bar|ez|smith|vest)\b/i;
// Moves that are bodyweight, banded, or cardio without a load.
const NO_LOAD =
  /\b(band|banded|bodyweight|bw|push\s*-?\s*ups?|sit\s*-?\s*ups?|crunch(es)?|burpees?|planks?|jumping\s*jacks?|mountain\s*climbers?|air\s*squats?|jump\s*squats?|squat\s*jumps?|hollow|dead\s*hang|inverted\s*rows?|shadow|skipping|shuttle|toe\s*walk(ing)?|saq|superman|bear\s*crawl|pull\s*-?\s*ups?|chin\s*-?\s*ups?|air\s*bike|sprints?|high\s*knees?|butt\s*kicks?|jump\s*rope|lompat\s*tali)\b/i;
const EQUIPMENT_NO_LOAD = /\b(bodyweight|body\s*weight|tanpa\s*alat|none|band|resistance\s*band|mat)\b/i;

/** False when the member doesn't need to log this movement (no weight to record). */
export function needsLoadInput(movementName: string, equipment: string | null | undefined, roundScheme: string | null | undefined): boolean {
  if (/\btabata\b/i.test(roundScheme ?? "")) return false;
  if (equipment?.trim()) return !EQUIPMENT_NO_LOAD.test(equipment) || LOADED.test(movementName);
  if (LOADED.test(movementName)) return true;
  return !NO_LOAD.test(movementName);
}
