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
  const mid = Math.ceil(rounds.length / 2);
  const columns = [rounds.slice(0, mid), rounds.slice(mid)];

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
          <div className="absolute left-10 top-8 flex flex-col items-start gap-1">
            <p style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Track Progressmu</p>
            <div className="relative" style={{ border: "2px solid #7c3aed", borderRadius: 6, padding: 6 }}>
              {qrSrc && (
                // eslint-disable-next-line @next/next/no-img-element -- rendered off-DOM into a downloadable PNG, next/image isn't applicable here
                <img ref={qrRef} src={qrSrc} alt="QR" style={{ width: 76, height: 76, display: "block" }} />
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

          <div className="absolute right-10 top-8 flex items-center gap-2">
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element -- rendered off-DOM into a downloadable PNG, next/image isn't applicable here
              <img ref={logoRef} src={logoSrc} alt="OLYMPUS" style={{ height: 22, width: "auto" }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>|</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#111827" }}>
              OLAHRAGA JADI SERU
            </span>
          </div>

          <h1
            className="text-center uppercase"
            style={{
              marginTop: 90,
              fontFamily: "var(--font-display, inherit)",
              fontSize: 44,
              fontWeight: 800,
              color: "#111827",
            }}
          >
            {focusLabel || dayLabel}
          </h1>

          <div className="grid grid-cols-2" style={{ marginTop: 24, columnGap: 48, rowGap: 20 }}>
            {columns.map((col, colIndex) => (
              <div key={colIndex} className="flex flex-col" style={{ gap: 18 }}>
                {col.map((round, i) => {
                  const roundNumber = colIndex * mid + i + 1;
                  const schemeLine =
                    round.scheme && round.sets
                      ? `${round.scheme} (${round.sets} set)`
                      : round.scheme || (round.sets ? `${round.sets} set` : "");
                  return (
                    <div key={roundNumber}>
                      <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>
                        Round {roundNumber}
                      </p>
                      {schemeLine && (
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "2px 0 6px" }}>
                          {schemeLine}
                        </p>
                      )}
                      {round.slots.map((slot, si) => {
                        const name = movementById.get(slot.movementId)?.name ?? "";
                        return (
                          <p key={si} style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "1px 0" }}>
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
