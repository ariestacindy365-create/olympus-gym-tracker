import type { MuscleKey } from "@/lib/muscles";

type Levels = Partial<Record<MuscleKey, number>>;

const TONES = {
  light: { body: "#d7dfeb", idle: "#c3cede", text: "#5d6880" },
  dark: { body: "#1f2a44", idle: "#2c3a5c", text: "#94a3b8" },
};
const LIT = ["", "#bfdbfe", "#60a5fa", "#2563eb"];

/** Left-side shape mirrored onto the right half of the 100-wide figure. */
function Pair({ children }: { children: React.ReactNode }) {
  return (
    <>
      <g>{children}</g>
      <g transform="translate(100 0) scale(-1 1)">{children}</g>
    </>
  );
}

function Figure({ front, levels, tone }: { front: boolean; levels: Levels; tone: "light" | "dark" }) {
  const t = TONES[tone];
  const c = (k: MuscleKey) => (levels[k] ? LIT[levels[k]!] : t.idle);
  return (
    <svg viewBox="0 0 100 190" className="h-full w-full" aria-hidden>
      <g fill={t.body}>
        <circle cx="50" cy="13" r="9" />
        <rect x="45" y="20" width="10" height="9" rx="3" />
        <path d="M33 31Q50 26 67 31L70 50Q66 70 64 88H36Q34 70 30 50Z" />
        <Pair>
          <path d="M31 32Q24 34 23 44L20 66 17 86 22 87 27 68 33 50Z" />
          <path d="M37 86 35 120 38 160 37 186H45L46 160 48 120 50 90Z" />
        </Pair>
      </g>
      {front ? (
        <Pair>
          <ellipse cx="34" cy="38" rx="6.5" ry="7.5" fill={c("delts")} />
          <path d="M49.4 34C43 33 38.5 35.5 37.8 41L38.6 48.5C42 50.5 46 50.8 49.4 49.8Z" fill={c("chest")} />
          <ellipse cx="29.5" cy="55" rx="4" ry="8.5" transform="rotate(12 29.5 55)" fill={c("biceps")} />
          <ellipse cx="24.5" cy="73" rx="3.4" ry="10" transform="rotate(12 24.5 73)" fill={c("forearms")} />
          <rect x="44" y="53" width="5.4" height="7" rx="1.6" fill={c("abs")} />
          <rect x="44" y="61.5" width="5.4" height="7" rx="1.6" fill={c("abs")} />
          <rect x="44" y="70" width="5.4" height="8" rx="1.6" fill={c("abs")} />
          <path d="M37.5 54 42.6 55 42.6 79 38.5 76Q36.5 65 37.5 54Z" fill={c("obliques")} />
          <ellipse cx="41.6" cy="110" rx="6.4" ry="19" transform="rotate(-3 41.6 110)" fill={c("quads")} />
          <ellipse cx="47.6" cy="102" rx="2.2" ry="10" fill={c("adductors")} />
          <ellipse cx="41.2" cy="154" rx="3.8" ry="14" fill={c("calves")} />
        </Pair>
      ) : (
        <>
          <path d="M50 27 39.5 34 44 44 50 54 56 44 60.5 34Z" fill={c("traps")} />
          <Pair>
            <ellipse cx="34" cy="38" rx="6.5" ry="7" fill={c("rdelts")} />
            <path d="M43.5 44 49.2 46 49.2 56 44 58Q41 51 43.5 44Z" fill={c("upback")} />
            <path d="M38 44Q35.5 56 39 66 45 73 49.2 74 49.2 60 43 59Q39 52 41.5 44Z" fill={c("lats")} />
            <ellipse cx="29.5" cy="55" rx="4" ry="8.5" transform="rotate(12 29.5 55)" fill={c("triceps")} />
            <ellipse cx="24.5" cy="73" rx="3.4" ry="10" transform="rotate(12 24.5 73)" fill={c("forearms")} />
            <ellipse cx="43" cy="93" rx="7" ry="7.6" fill={c("glutes")} />
            <ellipse cx="42" cy="118" rx="6" ry="15" fill={c("hams")} />
            <ellipse cx="41.4" cy="152" rx="4.6" ry="12" fill={c("calves")} />
          </Pair>
          <rect x="44.6" y="74" width="10.8" height="11" rx="3" fill={c("lowback")} />
        </>
      )}
    </svg>
  );
}

interface MuscleMapProps {
  levels: Levels;
  /** Figure height in px. */
  height?: number;
  tone?: "light" | "dark";
  labels?: boolean;
}

/** Front + back body figures with trained muscles lit in Olympus blue (brighter = more sets). */
export function MuscleMap({ levels, height = 120, tone = "light", labels = true }: MuscleMapProps) {
  const width = Math.round(height * 0.53);
  return (
    <div className="flex shrink-0 justify-center gap-2.5">
      {[true, false].map((front) => (
        <figure key={String(front)} className="m-0 text-center" style={{ width }}>
          <div style={{ height }}>
            <Figure front={front} levels={levels} tone={tone} />
          </div>
          {labels && (
            <figcaption className="mt-0.5 text-[10px] uppercase tracking-[0.12em]" style={{ color: TONES[tone].text }}>
              {front ? "Depan" : "Belakang"}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
