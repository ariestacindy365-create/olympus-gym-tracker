"use client";

import { emblemFor, type EmblemGlyph, type EmblemTier } from "@/lib/emblems";

// Metal palettes: [light, mid, dark] for the rim gradient and glyph.
const METAL: Record<EmblemTier, [string, string, string]> = {
  bronze: ["#f3c08b", "#c27a3f", "#7a4420"],
  silver: ["#ffffff", "#c6d0dc", "#7c8796"],
  gold: ["#fff3b0", "#f2c230", "#a8740b"],
  olympian: ["#e0f2ff", "#60a5fa", "#1d4ed8"],
};
const LAUREL_GOLD: [string, string, string] = ["#fff3b0", "#f2c230", "#a8740b"];

/** Center symbols, drawn in a 40×40 box. */
function Glyph({ glyph, fill }: { glyph: EmblemGlyph; fill: string }) {
  switch (glyph) {
    case "torch":
      return (
        <g fill={fill}>
          <path d="M20 2c5 6 8 9 8 14a8 8 0 0 1-16 0c0-3 2-5 3-7 0 3 1 5 3 5 0-5 2-8 2-12z" />
          <path d="M11 22h18l-2 5H13z" />
          <path d="M15 28h10l-3 12h-4z" />
        </g>
      );
    case "wings":
      // Hermes' wing: three rows of feathers sweeping up to the right.
      return (
        <g fill={fill}>
          <path d="M3 30c8 1 16-1 22-6 6-5 10-12 12-20-4 3-9 5-14 6 3-2 5-5 6-8-5 3-11 6-17 7 2-1 3-3 4-5-6 2-11 6-13 11 0 6 0 11 0 15z" />
          <path d="M3 33c9 2 18 1 25-3l-3 4c-7 3-15 4-22 3z" />
          <path d="M3 37c7 1 13 1 19-1l-3 3c-5 1-11 1-16 0z" />
        </g>
      );
    case "bolt":
      return <path fill={fill} d="M23 1 7 23h10l-4 16 20-24H22l5-14z" />;
    case "bow":
      return (
        <g fill="none" stroke={fill} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 3Q35 20 11 37" strokeWidth="4" />
          <path d="M11 3v34" strokeWidth="1.4" />
          <path d="M3 20h31" strokeWidth="2.6" />
          <path d="m30 15 7 5-7 5z" fill={fill} strokeWidth="1.5" />
          <path d="m3 20-2-4m2 4-2 4m5-4-2-4m2 4-2 4" strokeWidth="1.6" />
        </g>
      );
    case "helmet":
      // Corinthian / Spartan helmet with a crest.
      return (
        <g>
          <path fill={fill} d="M6 8c4-6 10-8 16-7-1 3-1 5 0 7-5 0-9 2-11 5z" opacity="0.85" />
          <path fill={fill} d="M20 7c9 0 15 7 15 16v14h-8l-1-9h-3v11h-6V28h-3l-1 9H5V23C5 14 11 7 20 7z" />
          <path fill="#0d1d42" d="M11 20h7v4h-7zM22 20h7v4h-7z" opacity="0.8" />
        </g>
      );
    case "atlas":
      return (
        <g>
          <circle cx="20" cy="15" r="12" fill={fill} />
          <g fill="none" stroke="#0d1d42" strokeWidth="1.4" opacity="0.55">
            <ellipse cx="20" cy="15" rx="5" ry="12" />
            <path d="M8 15h24M10 9h20M10 21h20" />
          </g>
          <path fill={fill} d="M4 38c1-8 4-12 8-13l3 3h10l3-3c4 1 7 5 8 13z" />
          <path fill={fill} d="M6 30c0-4 2-7 5-8l2 2c-2 1-4 3-4 6zM34 30c0-4-2-7-5-8l-2 2c2 1 4 3 4 6z" />
        </g>
      );
    case "owl":
      return (
        <g>
          <path fill={fill} d="M8 6l5 4c4-2 10-2 14 0l5-4v18c0 9-6 15-12 15S8 33 8 24z" />
          <circle cx="15" cy="18" r="5" fill="#0d1d42" />
          <circle cx="25" cy="18" r="5" fill="#0d1d42" />
          <circle cx="15" cy="18" r="2.2" fill={fill} />
          <circle cx="25" cy="18" r="2.2" fill={fill} />
          <path fill="#0d1d42" d="m20 22 2 3-2 2-2-2z" />
          <path fill="none" stroke="#0d1d42" strokeWidth="1.2" opacity="0.6" d="M14 30c2 1 4 1 6 0 2 1 4 1 6 0M15 34c2 1 3 1 5 0 2 1 3 1 5 0" />
        </g>
      );
    case "sun":
      return (
        <g fill={fill}>
          <circle cx="20" cy="20" r="8.5" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M20 1l2.2 7h-4.4z" transform={`rotate(${i * 30} 20 20)`} />
          ))}
        </g>
      );
    case "temple":
      return (
        <g fill={fill}>
          <path d="M20 2 38 11H2z" />
          <rect x="3" y="12" width="34" height="3" rx="0.6" />
          {[6, 13.5, 21, 28.5].map((x) => (
            <rect key={x} x={x} y="16.5" width="5" height="16" rx="1" />
          ))}
          <rect x="2" y="34" width="36" height="2.6" rx="0.6" />
          <rect x="0" y="37.2" width="40" height="2.8" rx="0.6" />
        </g>
      );
  }
}

interface EmblemProps {
  code: string;
  size?: number;
  locked?: boolean;
  /** 0..1 — progress ring shown on locked emblems. */
  progress?: number;
  className?: string;
}

/**
 * "Pantheon Olympus" emblem: a victor's laurel wreath around a deep navy
 * medallion with a metal rim, the series' god symbol in the centre, a ribbon
 * with its tier stars, and — for the top tier — Mount Olympus with a bolt.
 */
export function Emblem({ code, size = 96, locked = false, progress = 0, className = "" }: EmblemProps) {
  const style = emblemFor(code);
  const olympian = style.tier === "olympian";
  // Ids per palette (not per instance): every emblem of a palette defines
  // identical gradients, so repeats on one page are harmless — and separate
  // React roots (share cards, previews) can't collide with each other.
  const uid = `em-${locked ? "locked" : style.tier}`;
  const [light, mid, dark] = locked ? (["#e2e8f0", "#94a3b8", "#475569"] as const) : METAL[style.tier];
  const leaves = Array.from({ length: 7 }, (_, i) => i);

  return (
    <svg
      viewBox="0 0 120 132"
      width={size}
      height={(size * 132) / 120}
      className={className}
      role="img"
      aria-label={`Emblem ${style.series}`}
    >
      <defs>
        <linearGradient id={`rim${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.45" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`glyph${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
        <radialGradient id={`field${uid}`} cx="0.5" cy="0.35" r="0.75">
          <stop offset="0" stopColor={locked ? "#64748b" : olympian ? "#1e3a8a" : "#13295c"} />
          <stop offset="1" stopColor={locked ? "#334155" : "#050b1c"} />
        </radialGradient>
        <linearGradient id={`laurel${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={olympian && !locked ? LAUREL_GOLD[0] : light} />
          <stop offset="0.5" stopColor={olympian && !locked ? LAUREL_GOLD[1] : mid} />
          <stop offset="1" stopColor={olympian && !locked ? LAUREL_GOLD[2] : dark} />
        </linearGradient>
        <radialGradient id={`glow${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={mid} stopOpacity="0.55" />
          <stop offset="1" stopColor={mid} stopOpacity="0" />
        </radialGradient>
      </defs>

      {!locked && <circle cx="60" cy="58" r="58" fill={`url(#glow${uid})`} />}
      <g opacity={locked ? 0.6 : 1}>

      {/* Laurel wreath */}
      {[-1, 1].map((side) => (
        <g key={side} transform={side === 1 ? "translate(120 0) scale(-1 1)" : undefined}>
          <path d="M44 104C22 96 12 76 14 50" fill="none" stroke={`url(#laurel${uid})`} strokeWidth="2.4" strokeLinecap="round" />
          {leaves.map((i) => {
            const t = i / (leaves.length - 1);
            const angle = 200 - t * 95;
            const rad = (angle * Math.PI) / 180;
            const cx = 60 + 47 * Math.cos(rad);
            const cy = 60 - 47 * Math.sin(rad) * -1;
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx="7.5"
                ry="3.4"
                fill={`url(#laurel${uid})`}
                transform={`rotate(${-angle + 120} ${cx} ${cy})`}
              />
            );
          })}
        </g>
      ))}

      {/* Sunburst behind the medallion for gold and Olympian */}
      {!locked && (style.tier === "gold" || olympian) && (
        <g fill={`url(#laurel${uid})`} opacity="0.9">
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d="M60 12l3.2 9h-6.4z" transform={`rotate(${i * 22.5} 60 58)`} />
          ))}
        </g>
      )}

      {/* Medallion */}
      <circle cx="60" cy="58" r="40" fill={`url(#rim${uid})`} />
      <circle cx="60" cy="58" r="34.5" fill={`url(#field${uid})`} />
      {/* Greek key ticks around the field */}
      <circle cx="60" cy="58" r="37.2" fill="none" stroke="#050b1c" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 2.2" />
      {/* Light rays */}
      <g opacity="0.12" stroke={light} strokeWidth="1">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M60 58V25" transform={`rotate(${i * 30} 60 58)`} />
        ))}
      </g>

      <g transform="translate(37 35) scale(1.15)">
        <Glyph glyph={style.glyph} fill={`url(#glyph${uid})`} />
      </g>

      {/* Mount Olympus + bolt crown for the top tier */}
      {olympian && (
        <g>
          <path d="M44 22 54 11l4 4 6-8 12 15z" fill={`url(#rim${uid})`} stroke="#050b1c" strokeWidth="1" strokeLinejoin="round" />
          <path d="M61 0 56 9h4l-2 7 7-10h-4l2-6z" fill="#facc15" stroke="#050b1c" strokeWidth="0.8" />
        </g>
      )}

      {/* Ribbon with tier stars */}
      <path d="M24 100h72l-6 8 6 8H24l6-8z" fill={`url(#rim${uid})`} stroke="#050b1c" strokeOpacity="0.3" />
      <path d="M30 100h60v16H30z" fill="#0b1532" />
      <g fill={light}>
        {Array.from({ length: style.stars }, (_, i) => {
          const x = 60 + (i - (style.stars - 1) / 2) * 10;
          return (
            <path
              key={i}
              d="M0-4 1.2-1.2 4.2-1.2 1.8 0.6 2.6 3.6 0 1.8-2.6 3.6-1.8 0.6-4.2-1.2-1.2-1.2z"
              transform={`translate(${x} 108)`}
            />
          );
        })}
      </g>

      </g>

      {/* Progress ring on locked emblems */}
      {locked && progress > 0 && (
        <circle
          cx="60"
          cy="58"
          r="43"
          fill="none"
          stroke="#2563eb"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${Math.min(1, progress) * 270} 400`}
          transform="rotate(-90 60 58)"
        />
      )}
    </svg>
  );
}
