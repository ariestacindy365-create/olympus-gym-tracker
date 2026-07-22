"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/Button";

export interface BodyMetricWin {
  label: string;
  detail: string;
  icon: string;
}

export interface BodyMetricCelebrationData {
  memberName: string;
  wins: BodyMetricWin[];
}

interface BodyMetricCelebrationModalProps {
  data: BodyMetricCelebrationData;
  onClose: () => void;
}

const ACCENT = "#2563eb";
const ACCENT_MUTED = "#64748b";
const ACCENT_SOFT = "rgba(37, 99, 235, 0.08)";
const ACCENT_SOFT_BORDER = "rgba(37, 99, 235, 0.25)";

export function BodyMetricCelebrationModal({ data, onClose }: BodyMetricCelebrationModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateLabel = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    const colors = [ACCENT, "#60a5fa", "#ffffff", "#34d399"];

    confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.55 }, colors, zIndex: 60 });

    const end = Date.now() + 2000;
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, zIndex: 60 });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, zIndex: 60 });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  function shareText() {
    return `Progress baru ${data.memberName} di OLYMPUS Lifting Club! ${data.wins.map((w) => w.label).join(", ")} 💪`;
  }

  async function shareOrDownload(file: File) {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "OLYMPUS Lifting Club", text: shareText() });
        return;
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") throw e;
        console.error("navigator.share failed, falling back to download:", e);
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShareImage() {
    setError(null);
    setPending(true);
    try {
      if (!cardRef.current) throw new Error("card not ready");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `olympus-progress-${Date.now()}.png`, { type: "image/png" });
      await shareOrDownload(file);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        console.error("Body metric image share failed:", e);
        setError("Gagal menyiapkan gambar. Coba lagi.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-4">
        <div ref={cardRef} className="w-full rounded-[32px] p-5" style={{ background: "#dbeafe" }}>
          <div
            className="relative rounded-3xl px-6 py-8 text-center"
            style={{ background: "#ffffff", border: `2px solid ${ACCENT}` }}
          >
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="absolute right-4 top-4 text-lg leading-none text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>

            <p className="font-display text-2xl font-bold uppercase tracking-wide text-slate-900">
              {data.memberName}
            </p>

            <p className="mt-2 text-sm font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
              🎉 Progress Baru!
            </p>

            <div className="mt-5 flex flex-col gap-3">
              {data.wins.map((win) => (
                <div
                  key={win.label}
                  className="rounded-xl px-4 py-3 text-left"
                  style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT_SOFT_BORDER}` }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT_MUTED }}>
                    {win.icon} {win.label}
                  </p>
                  <p className="mt-0.5 font-display text-xl font-bold" style={{ color: ACCENT }}>
                    {win.detail}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs" style={{ color: ACCENT_MUTED }}>
              {dateLabel}
            </p>

            <div className="my-5 h-px w-full bg-slate-200" />

            <div className="flex items-center justify-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- rendered off-DOM into a shareable PNG, next/image isn't applicable here */}
              <img src="/olympus-logo.png" alt="OLYMPUS" className="h-6 w-auto" />
              <span className="text-sm font-bold uppercase tracking-wide text-slate-900">Lifting Club</span>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button onClick={handleShareImage} disabled={pending} className="w-full">
          {pending ? "Menyiapkan..." : "📤 Bagikan Gambar"}
        </Button>
        <button onClick={onClose} className="text-sm text-nav-muted hover:text-nav-foreground">
          Nanti saja
        </button>
      </div>
    </div>
  );
}
