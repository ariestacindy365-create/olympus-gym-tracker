// Gerakan yang tidak memakai beban (kolom kg tidak perlu diisi). Aman di browser.
//
// Dikenali dari data alat gerakan ("Bodyweight", "Tanpa alat", …) atau dari
// namanya. Banded juga tidak perlu diisi kg; + kg tetap tersedia untuk beban tambahan.

const NO_WEIGHT_EQUIPMENT = /^(body\s*-?weight|bw|tanpa\s+(alat|beban)|no\s+equipment|none)$/i;
const WEIGHT_EQUIPMENT = /barbell|dumbbell|kettlebell|cable|machine|mesin|plate|sandbag|med(icine)?\s*ball|smith|landmine|trap\s*bar|ez\s*bar|sled|rope/i;

const WEIGHT_WORDS =
  /\b(bb|db|kb|sb|mb|barbell|dumbbell|dumbell|kettlebell|cable|machine|smith|plate|sandbag|med\s*ball|medicine|weighted|landmine|trap\s*bar|ez|sled|vest|pulldown|press)\b/i;

const NO_WEIGHT_NAMES = [
  /\b(band(ed)?|resistance[\s-]*band|karet)\b/i,
  /\bplank/i,
  /\bpush[\s-]?ups?\b/i,
  /\bpull[\s-]?ups?\b/i,
  /\bchin[\s-]?ups?\b/i,
  /\bsit[\s-]?ups?\b/i,
  /\bcrunch/i,
  /\bburpee/i,
  /\bmountain\s*climber/i,
  /\bjumping\s*jack/i,
  /\bair\s*squat/i,
  /\bbody\s*-?weight\b/i,
  /\bbear\s*crawl/i,
  /\bcrab\s*walk/i,
  /\bhollow\b/i,
  /\bdead\s*bug/i,
  /\bbird\s*dog/i,
  /\bsuperman\b/i,
  /\b(flutter|scissor)\s*kick/i,
  /\b(leg|knee)\s*raise/i,
  /\bv[\s-]?ups?\b/i,
  /\btoes?[\s-]*to[\s-]*bar/i,
  /\binchworm/i,
  /\bwall\s*sit/i,
  /\bhigh\s*knee/i,
  /\bbutt\s*kick/i,
  /\bskater/i,
  /\b(star|tuck|broad|box)\s*jump/i,
  /\bjump\s*squat/i,
  /\bsquat\s*jump/i,
  /\blari\b/i,
  /\brun(ning)?\b/i,
  /\bsprint/i,
  /\bshuttle\b/i,
  /\bjump\s*rope/i,
  /\bskipping\b/i,
  /\bdouble[\s-]*unders?\b/i,
  /\bdips?\b/i,
  /\bhandstand/i,
  /\bpistol\b/i,
  /\bsprawl/i,
  /\bspiderman/i,
  /\bglute\s*bridge/i,
  /\b(assault|air|echo)\s*bike\b/i,
  /\bbike\s*erg/i,
  /\bski\s*-?\s*erg/i,
  /\brow(ing)?\s*(erg|machine)\b/i,
  /\brower\b/i,
];

/** Gerakan tanpa beban? (kolom kg cukup disembunyikan, beban = 0). */
export function isNoWeightExercise(name: string, equipment?: string | null): boolean {
  const eq = (equipment ?? "").trim();
  if (eq && (NO_WEIGHT_EQUIPMENT.test(eq) || /\b(resistance[\s-]*)?bands?(ed)?\b|\bkaret\b/i.test(eq))) return true;
  if (eq && WEIGHT_EQUIPMENT.test(eq)) return false;
  if (/\bband(ed)?\b/i.test(name)) return true;
  if (WEIGHT_WORDS.test(name)) return false;
  return NO_WEIGHT_NAMES.some((re) => re.test(name));
}

/** Preserve additional weights already entered or saved, including offline rows. */
export function shouldShowWeight(noWeight: boolean, opened: boolean, lastWeight: number | undefined, rows: { w: string; saved: { weight: number } | null }[]) {
  return !noWeight || opened || (lastWeight ?? 0) > 0 || rows.some((row) => (row.saved?.weight ?? 0) > 0 || Number(row.w.replace(",", ".")) > 0);
}
