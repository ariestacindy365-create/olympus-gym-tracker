// Visual identity for achievements ("Pantheon Olympus"): every series of
// achievements carries the symbol of a god of Olympus, and climbs metal tiers
// toward the summit. Client-safe — achievements.ts itself is server-only.

export type EmblemGlyph = "torch" | "wings" | "bolt" | "bow" | "helmet" | "atlas" | "owl" | "sun" | "temple";
export type EmblemTier = "bronze" | "silver" | "gold" | "olympian";

export interface EmblemStyle {
  glyph: EmblemGlyph;
  tier: EmblemTier;
  /** 1–5 stars on the ribbon: the step within its series. */
  stars: number;
  /** Mythic series name shown under the emblem. */
  series: string;
}

export const TIER_LABEL: Record<EmblemTier, string> = {
  bronze: "Perunggu",
  silver: "Perak",
  gold: "Emas",
  olympian: "Olympian",
};

export const SERIES_STORY: Record<EmblemGlyph, string> = {
  torch: "Obor Olympia — nyala yang dijaga dengan datang latihan lagi dan lagi.",
  wings: "Sayap Hermes — dewa tercepat, untuk minggu-minggu yang penuh latihan.",
  bolt: "Petir Zeus — setiap rekor baru adalah sambaran petir.",
  bow: "Busur Artemis — pemburu yang menguasai banyak gerakan.",
  helmet: "Helm Sparta — kekuatan prajurit yang mengangkat berat badannya sendiri.",
  atlas: "Pundak Atlas — sang titan pemikul dunia, untuk total angkatanmu.",
  owl: "Burung hantu Athena — kebijaksanaan memantau badan sendiri.",
  sun: "Cahaya Apollo — transformasi badan yang terlihat.",
  temple: "Kuil Olympus — setia dan terus bertumbuh bersama Olympus.",
};

const S = (glyph: EmblemGlyph, series: string, tier: EmblemTier, stars: number): EmblemStyle => ({ glyph, series, tier, stars });

export const EMBLEMS: Record<string, EmblemStyle> = {
  SESSIONS_1: S("torch", "Obor Olympia", "bronze", 1),
  SESSIONS_10: S("torch", "Obor Olympia", "silver", 2),
  SESSIONS_25: S("torch", "Obor Olympia", "gold", 3),
  SESSIONS_50: S("torch", "Obor Olympia", "gold", 4),
  SESSIONS_100: S("torch", "Obor Olympia", "olympian", 5),
  WEEKLY_3: S("wings", "Sayap Hermes", "bronze", 1),
  WEEKLY_4: S("wings", "Sayap Hermes", "silver", 2),
  WEEKLY_5: S("wings", "Sayap Hermes", "gold", 3),
  WEEKLY_6: S("wings", "Sayap Hermes", "olympian", 4),
  PR_1: S("bolt", "Petir Zeus", "bronze", 1),
  PR_10: S("bolt", "Petir Zeus", "gold", 2),
  PR_25: S("bolt", "Petir Zeus", "olympian", 3),
  EXERCISES_5: S("bow", "Busur Artemis", "silver", 1),
  BODYWEIGHT_1X: S("helmet", "Helm Sparta", "gold", 1),
  VOLUME_10000: S("atlas", "Pundak Atlas", "bronze", 1),
  VOLUME_50000: S("atlas", "Pundak Atlas", "gold", 2),
  VOLUME_100000: S("atlas", "Pundak Atlas", "olympian", 3),
  BODY_FIRST_LOG: S("owl", "Mata Athena", "silver", 1),
  WEIGHT_LOSS_2: S("sun", "Cahaya Apollo", "silver", 1),
  WEIGHT_LOSS_5: S("sun", "Cahaya Apollo", "gold", 2),
  MEMBER_1_MONTH: S("temple", "Kuil Olympus", "bronze", 1),
  MEMBER_3_MONTHS: S("temple", "Kuil Olympus", "silver", 2),
  MEMBER_6_MONTHS: S("temple", "Kuil Olympus", "gold", 3),
  MEMBER_1_YEAR: S("temple", "Kuil Olympus", "olympian", 4),
};

export function emblemFor(code: string): EmblemStyle {
  return EMBLEMS[code] ?? S("torch", "Olympus", "bronze", 1);
}
