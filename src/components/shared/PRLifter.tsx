import { SKIN_TONES, type LifterCharacter, type SkinTone } from "@/lib/volumeStory";

const TOP = "#facc15";
const TOP_SHADE = "#eab308";
const INK = "#1e3a8a";
const BOTTOMS = "#111827";
const HAIR = "#2a1c14";
const HIJAB = "#dbeafe";
const HIJAB_SHADE = "#bfdbfe";

/**
 * The lifter who carries the PR board on the class TV, in the look the
 * member picked for their share cards (cowok, cewek, cewek berhijab + skin
 * tone). Front view, arms up to the board. PRCelebration animates the parts
 * by id: prc-body, prc-legL/R, prc-armL/R, prc-faceWalk, prc-faceJoy.
 */
export function PRLifter({ character, skinTone, style }: { character: LifterCharacter; skinTone: SkinTone; style?: React.CSSProperties }) {
  const skin = (SKIN_TONES.find((t) => t.id === skinTone) ?? SKIN_TONES[1]).color;
  const shade = `color-mix(in srgb, ${skin} 80%, #000)`;
  const female = character !== "pria";
  const sleeve = character === "hijab" ? TOP : skin;
  const sleeveShade = character === "hijab" ? TOP_SHADE : shade;
  const legFill = female ? BOTTOMS : skin;
  const legShade = female ? "#0b1220" : shade;
  const shoulder = female ? 21 : 25;
  const waist = female ? 16 : 19;

  const leg = (id: string, x: number, fill: string) => (
    <g transform={`translate(${x} 150)`}>
      <g id={id}>
        <rect x="-8" y="-2" width="16" height="42" rx="7" fill={fill} />
        <rect x="-6.5" y="34" width="13" height="40" rx="6" fill={fill} />
        {/* Sock + trainer, toes out. */}
        <rect x="-6.5" y="66" width="13" height="7" fill="#f8fafc" />
        <path d="M-9 72 H9 C14 72 16 82 9 82 H-9 C-14 82 -14 72 -9 72 Z" fill="#f8fafc" />
        <path d="M-10 79 H11" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </g>
  );
  const arm = (id: string, side: 1 | -1, fill: string) => (
    <g transform={`translate(${70 + side * (shoulder - 3)} 90)`}>
      <g id={id}>
        {/* Upper arm out to the elbow, forearm up to the board. */}
        <path d={`M0 0 L${side * 13} -36`} stroke={fill} strokeWidth="13" strokeLinecap="round" fill="none" />
        <path d={`M${side * 13} -36 L${side * 9} -76`} stroke={fill} strokeWidth="11.5" strokeLinecap="round" fill="none" />
        <circle cx={side * 9} cy={-80} r="8" fill={skin} />
      </g>
    </g>
  );

  return (
    <svg className="block w-auto overflow-visible" style={style} viewBox="0 0 140 240" aria-hidden>
      <ellipse id="prc-shadow" cx="70" cy="234" rx="40" ry="6" fill="rgb(0 0 0 / .3)" />
      <g id="prc-body">
        {/* Behind the body: long hair, or the back of the hijab. */}
        {character === "wanita" && <path d="M49 50 C46 78 50 96 56 104 L84 104 C90 96 94 78 91 50 Z" fill={HAIR} />}
        {character === "hijab" && <path d="M46 52 C40 84 44 104 52 112 L88 112 C96 104 100 84 94 52 Z" fill={HIJAB_SHADE} />}

        {arm("prc-armL", -1, sleeveShade)}
        {arm("prc-armR", 1, sleeve)}

        {leg("prc-legL", 60, legShade)}
        {leg("prc-legR", 80, legFill)}

        {/* Shorts (cowok) or the top of the leggings. */}
        <path d={`M${70 - waist - 3} 138 H${70 + waist + 3} L${70 + waist + 5} ${female ? 160 : 172} H72 L70 162 L68 ${female ? 160 : 172} H${70 - waist - 5} Z`} fill={BOTTOMS} />

        {/* Top with the Olympus ring. */}
        <path
          d={`M${70 - shoulder} 86 C${70 - shoulder} 78 ${70 - shoulder + 8} 76 ${70 - 9} 76 H${70 + 9} C${70 + shoulder - 8} 76 ${70 + shoulder} 78 ${70 + shoulder} 86 L${70 + waist} 142 H${70 - waist} Z`}
          fill={TOP}
        />
        <path d={`M${70 + shoulder - 5} 88 L${70 + waist - 2} 142 H${70 + waist} L${70 + shoulder} 86 Z`} fill={TOP_SHADE} />
        <circle cx="70" cy="108" r="9.5" fill="none" stroke={INK} strokeWidth="3.6" />
        <text x="70" y="133" textAnchor="middle" fontFamily="Oswald, Impact, sans-serif" fontSize="7.5" fontWeight="700" fill={INK} letterSpacing=".5">
          OLYMPUS
        </text>

        {/* Neck and head. */}
        {character !== "hijab" && <rect x="64" y="66" width="12" height="14" rx="4" fill={shade} />}
        {character === "hijab" && <ellipse cx="70" cy="84" rx={shoulder - 2} ry="13" fill={HIJAB} />}
        <circle cx="70" cy="50" r="20" fill={skin} />
        {character === "pria" && <path d="M50 49 C48 30 60 25 72 26 C85 27 92 36 90 49 C85 40 76 37 66 38 C58 39 53 43 50 49 Z" fill={HAIR} />}
        {character === "wanita" && (
          <>
            <circle cx="74" cy="24" r="10" fill={HAIR} />
            <path d="M49 54 C46 32 58 26 71 27 C85 28 93 38 91 54 C88 44 80 38 70 38 C60 38 52 44 49 54 Z" fill={HAIR} />
          </>
        )}
        {character === "hijab" && (
          <path
            d="M70 27 C54 27 46 38 46 52 C46 66 54 78 70 78 C86 78 94 66 94 52 C94 38 86 27 70 27 Z M70 36 C60 36 54 43 54 53 C54 63 60 70 70 70 C80 70 86 63 86 53 C86 43 80 36 70 36 Z"
            fill={HIJAB}
            fillRule="evenodd"
          />
        )}
        <circle cx="56" cy="57" r="3.4" fill="#fb7185" opacity=".45" />
        <circle cx="84" cy="57" r="3.4" fill="#fb7185" opacity=".45" />
        {/* Walking: eyes open, a smile. */}
        <g id="prc-faceWalk">
          <circle cx="62.5" cy="51" r="2.4" fill="#1b130d" />
          <circle cx="77.5" cy="51" r="2.4" fill="#1b130d" />
          <path d="M63 60 C67 64 73 64 77 60" stroke="#7c2d12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
        {/* Celebrating: eyes squeezed shut, a big open grin. */}
        <g id="prc-faceJoy" display="none">
          <path d="M59 52 Q62.5 47 66 52 M74 52 Q77.5 47 81 52" stroke="#1b130d" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M61 58 H79 C79 67 61 67 61 58 Z" fill="#7c2d12" />
          <path d="M64 58 H76 V60.5 H64 Z" fill="#fff" />
        </g>
      </g>
    </svg>
  );
}
