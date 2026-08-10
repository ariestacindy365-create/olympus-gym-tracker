"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/Button";
import { fetchAsDataUrl, compositeImagesOntoDataUrl } from "@/lib/imageDataUrl";
import { groupSlotsIntoRounds, type SlotLike } from "@/lib/programRounds";
import { type MovementOption } from "@/components/coach/MovementCombobox";

interface ProgramDaySlideProps {
  dayLabel: string;
  focusLabel: string;
  slots: SlotLike[];
  movements: MovementOption[];
}

// Where the QR code on the slide points — members scan it to jump straight
// into the app instead of a coach having to type the URL out for them.
const QR_TARGET_URL = "https://olympus-gym-tracker.vercel.app";

export function ProgramDaySlide({ dayLabel, focusLabel, slots, movements }: ProgramDaySlideProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLImageElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(QR_TARGET_URL, { margin: 1, width: 240 })
      .then(setQrSrc)
      .catch(() => {});
    fetchAsDataUrl("/olympus-logo.png")
      .then(setLogoSrc)
      .catch(() => {});
  }, []);

  const movementById = new Map(movements.map((m) => [m.id, m]));
  const rounds = groupSlotsIntoRounds(slots.filter((s) => s.movementId));

  // Balance the two columns by content weight (not just round count) — a
  // plain half-and-half split by count can leave one column much taller
  // than the other when rounds have uneven exercise counts, which spills
  // text past the card's fixed bottom edge. Try every split point (rounds
  // are few, so this is cheap) and keep whichever minimizes the taller side.
  const weights = rounds.map((r) => 2 + r.slots.length);
  const prefix = [0];
  for (const w of weights) prefix.push(prefix[prefix.length - 1] + w);
  const totalWeight = prefix[prefix.length - 1];
  let splitIndex = rounds.length;
  let bestMax = Infinity;
  for (let i = 1; i <= rounds.length; i++) {
    const left = prefix[i];
    const right = totalWeight - left;
    const columnMax = Math.max(left, right);
    if (columnMax < bestMax) {
      bestMax = columnMax;
      splitIndex = i;
    }
  }
  const columns = [rounds.slice(0, splitIndex), rounds.slice(splitIndex)];
  const maxColumnWeight = Math.max(bestMax, 1);
  // Card height is fixed (matches Canva's 1920x1080 import size), so a day
  // with more rounds/exercises than usual needs smaller text to still fit
  // rather than spilling past the bottom edge.
  const scale = Math.max(0.72, Math.min(1, 15 / maxColumnWeight));

  async function handleDownload() {
    setError(null);
    setPending(true);
    try {
      if (!cardRef.current) throw new Error("slide not ready");
      let dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const images = [qrRef.current, logoRef.current].filter((el): el is HTMLImageElement => !!el);
      if (images.length > 0) {
        dataUrl = await compositeImagesOntoDataUrl(dataUrl, cardRef.current, images);
      }
      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = `${dayLabel}-${focusLabel || "program"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.href = url;
      a.download = `olympus-${slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Program slide download failed:", e);
      setError("Gagal membuat gambar. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <div ref={cardRef} className="relative bg-white" style={{ width: 960, height: 540, padding: 40 }}>
          <div className="absolute left-8 top-6 flex flex-col items-start gap-0.5">
            <p style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>Track Progressmu</p>
            <div className="relative" style={{ border: "2px solid #7c3aed", borderRadius: 6, padding: 5 }}>
              {qrSrc && (
                // eslint-disable-next-line @next/next/no-img-element -- rendered off-DOM into a downloadable PNG, next/image isn't applicable here
                <img ref={qrRef} src={qrSrc} alt="QR" style={{ width: 68, height: 68, display: "block" }} />
              )}
              <div
                className="absolute"
                style={{
                  left: -6,
                  bottom: -8,
                  width: 18,
                  height: 12,
                  background: "#9ca3af",
                  clipPath: "polygon(0 0, 100% 0, 0 100%)",
                }}
              />
            </div>
          </div>

          <div className="absolute right-8 top-6 flex items-center gap-1.5">
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element -- rendered off-DOM into a downloadable PNG, next/image isn't applicable here
              <img ref={logoRef} src={logoSrc} alt="OLYMPUS" style={{ height: 20, width: "auto" }} />
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>|</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "#111827" }}>
              OLAHRAGA JADI SERU
            </span>
          </div>

          <h1
            className="text-center uppercase"
            style={{
              marginTop: 56,
              fontFamily: "var(--font-display, inherit)",
              fontSize: 42,
              fontWeight: 800,
              color: "#111827",
            }}
          >
            {focusLabel || dayLabel}
          </h1>

          <div className="grid grid-cols-2" style={{ marginTop: 20, columnGap: 48, rowGap: 14 }}>
            {columns.map((col, colIndex) => (
              <div key={colIndex} className="flex flex-col" style={{ gap: 14 * scale }}>
                {col.map((round, i) => {
                  const roundNumber = (colIndex === 0 ? 0 : splitIndex) + i + 1;
                  const schemeLine =
                    round.scheme && round.sets
                      ? `${round.scheme} (${round.sets} set)`
                      : round.scheme || (round.sets ? `${round.sets} set` : "");
                  return (
                    <div key={roundNumber}>
                      <p style={{ fontSize: 20 * scale, fontWeight: 800, color: "#111827", margin: 0 }}>
                        Round {roundNumber}
                      </p>
                      {schemeLine && (
                        <p
                          style={{
                            fontSize: 14 * scale,
                            fontWeight: 700,
                            color: "#111827",
                            margin: `${2 * scale}px 0 ${4 * scale}px`,
                          }}
                        >
                          {schemeLine}
                        </p>
                      )}
                      {round.slots.map((slot, si) => {
                        const name = movementById.get(slot.movementId)?.name ?? "";
                        return (
                          <p
                            key={si}
                            style={{
                              fontSize: 15 * scale,
                              fontWeight: 700,
                              color: "#111827",
                              margin: `${1 * scale}px 0`,
                            }}
                          >
                            {slot.slotLabel ? `${slot.slotLabel}. ` : ""}
                            {name}
                            {slot.repTarget ? ` ${slot.repTarget} reps` : ""}
                          </p>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div
            className="pointer-events-none absolute"
            style={{
              right: 0,
              bottom: 0,
              width: 220,
              height: 150,
              backgroundImage: "radial-gradient(circle, #d1d5db 1.5px, transparent 1.5px)",
              backgroundSize: "14px 14px",
              WebkitMaskImage: "radial-gradient(circle at bottom right, black, transparent 75%)",
              maskImage: "radial-gradient(circle at bottom right, black, transparent 75%)",
            }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button onClick={handleDownload} disabled={pending || !logoSrc || !qrSrc} className="self-start px-6">
        {pending ? "Menyiapkan..." : "📥 Download Gambar"}
      </Button>
    </div>
  );
}
