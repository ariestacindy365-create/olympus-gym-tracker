"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { splitIntoColumns, type ProgramSlideData } from "@/lib/programSlide";

// Design space of the slide; it's scaled to whatever width it's shown at and
// exported at this size (×1.2 = 1920×1080) for the TV / WhatsApp.
export const SLIDE_W = 1600;
export const SLIDE_H = 900;

const INK = "#111111";
const FONT = "var(--font-inter), Inter, system-ui, sans-serif";

/** "Jangan lupa catat bebannya! Pantau progress-nya!" sticker from the Canva template. */
function CatatSticker() {
  return (
    <div style={{ position: "absolute", right: 36, top: 100, width: 250, transform: "rotate(-5deg)", fontFamily: FONT, textAlign: "center" }}>
      <div
        style={{
          background: "#fff",
          border: `5px solid ${INK}`,
          borderRadius: 22,
          padding: "14px 16px 12px",
          boxShadow: `8px 8px 0 ${INK}`,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, fontStyle: "italic", color: INK, letterSpacing: 1 }}>JANGAN LUPA</p>
        <p
          style={{
            margin: "2px 0 8px",
            fontSize: 38,
            lineHeight: 0.98,
            fontWeight: 900,
            fontStyle: "italic",
            color: "#facc15",
            WebkitTextStroke: `2px ${INK}`,
            textShadow: `3px 3px 0 ${INK}`,
          }}
        >
          CATAT
          <br />
          BEBANNYA!
        </p>
        <div style={{ background: INK, borderRadius: 12, padding: "6px 8px", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <svg width="38" height="30" viewBox="0 0 38 30" aria-hidden>
            <rect x="2" y="18" width="6" height="10" fill="#22c55e" />
            <rect x="12" y="12" width="6" height="16" fill="#22c55e" />
            <rect x="22" y="6" width="6" height="22" fill="#22c55e" />
            <path d="M2 14 L14 6 L22 10 L34 2" stroke="#facc15" strokeWidth="3" fill="none" />
          </svg>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 900, fontStyle: "italic", color: "#fff", lineHeight: 1.05, whiteSpace: "nowrap" }}>
            PANTAU
            <br />
            <span style={{ color: "#22c55e" }}>PROGRESS</span>-NYA!
          </p>
        </div>
      </div>
    </div>
  );
}

interface SlideCanvasProps {
  data: ProgramSlideData;
  qrDataUrl: string | null;
}

/** The slide at its full 1600×900 design size (what gets exported). */
export const SlideCanvas = forwardRef<HTMLDivElement, SlideCanvasProps & { style?: React.CSSProperties }>(
  function SlideCanvas({ data, qrDataUrl, style }, ref) {
    const [left, right] = splitIntoColumns(data.rounds);
    // Shrink the text when a day has many exercises so both columns fit.
    const colHeight = (col: typeof left) =>
      col.reduce((h, r) => h + 66 + (r.schemeLine ? 44 : 0) + r.items.length * 42 + 30, 0);
    const scale = Math.min(1, 600 / Math.max(1, colHeight(left), colHeight(right)));
    const title = data.title.toUpperCase();
    const titleSize = Math.min(96, Math.floor(1700 / Math.max(8, title.length)));

    const column = (rounds: typeof left, x: number) => (
      <div style={{ position: "absolute", left: x, top: 268, width: 720, display: "flex", flexDirection: "column", gap: 30 * scale }}>
        {rounds.map((r) => (
          <div key={r.number}>
            <p style={{ margin: 0, fontSize: 56 * scale, fontWeight: 800, color: INK, lineHeight: 1.15 }}>Round {r.number}</p>
            {r.schemeLine && (
              <p style={{ margin: `${4 * scale}px 0 ${6 * scale}px`, fontSize: 33 * scale, fontWeight: 800, color: INK }}>
                {r.schemeLine}
              </p>
            )}
            {r.items.map((item, i) => (
              <p key={i} style={{ margin: 0, fontSize: 30 * scale, fontWeight: 700, color: INK, lineHeight: 1.38 }}>
                {item}
              </p>
            ))}
          </div>
        ))}
      </div>
    );

    return (
      <div
        ref={ref}
        style={{
          position: "relative",
          width: SLIDE_W,
          height: SLIDE_H,
          overflow: "hidden",
          background: "#ffffff",
          fontFamily: FONT,
          textAlign: "left",
          ...style,
        }}
      >
        {/* Dotted texture, bottom right */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 520,
            height: 560,
            backgroundImage: "radial-gradient(circle, #cfcfcf 3.2px, transparent 3.6px)",
            backgroundSize: "22px 22px",
            WebkitMaskImage: "linear-gradient(135deg, transparent 25%, #000 75%)",
            maskImage: "linear-gradient(135deg, transparent 25%, #000 75%)",
          }}
        />

        {/* QR: Track Progressmu */}
        {qrDataUrl && (
          <div style={{ position: "absolute", left: 34, top: 18 }}>
            <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: INK }}>Track Progressmu</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="" width={170} height={170} style={{ display: "block" }} />
          </div>
        )}

        {/* Logo */}
        <div style={{ position: "absolute", right: 330, top: 34, display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/olympus-logo.png" alt="Olympus" style={{ height: 44, width: "auto" }} />
          <span style={{ fontSize: 20, fontWeight: 800, color: INK, letterSpacing: 1.5 }}>| OLAHRAGA JADI SERU</span>
        </div>

        {/* Title */}
        <p
          style={{
            position: "absolute",
            left: 230,
            right: 330,
            top: 90,
            margin: 0,
            textAlign: "center",
            fontSize: titleSize,
            fontWeight: 800,
            color: INK,
            letterSpacing: 1,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </p>

        <CatatSticker />

        {/* Slanted accent next to Round 1 */}
        <div aria-hidden style={{ position: "absolute", left: 30, top: 276, width: 58, height: 20, background: "#4b5563", transform: "skewX(-30deg)" }} />

        {column(left, 100)}
        {column(right, 880)}
      </div>
    );
  }
);

/** QR pointing members to the app (log in → catat beban). */
export function useAppQrCode(): string | null {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`${window.location.origin}/login`, { margin: 0, width: 340, errorCorrectionLevel: "M" }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return qr;
}

interface ProgramSlideProps {
  data: ProgramSlideData;
  qrDataUrl: string | null;
  className?: string;
}

/** The slide scaled down to its container's width, keeping 16:9. */
export function ProgramSlide({ data, qrDataUrl, className = "" }: ProgramSlideProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / SLIDE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className={`relative w-full overflow-hidden bg-white ${className}`} style={{ aspectRatio: "16 / 9" }}>
      {scale > 0 && (
        <SlideCanvas
          data={data}
          qrDataUrl={qrDataUrl}
          style={{ position: "absolute", left: 0, top: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      )}
    </div>
  );
}
