"use client";

import { useRef } from "react";

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  labelledBy?: string;
}

export function PinInput({ length = 4, value, onChange, disabled, labelledBy }: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function handleChange(index: number, raw: string) {
    const entered = raw.replace(/\D/g, "");
    // A PIN stays contiguous: clearing a digit also clears its suffix so
    // the remaining digits cannot silently move into different positions.
    const next = entered.length > 1
      ? entered.slice(0, length)
      : value.slice(0, index) + entered + value.slice(index + 1);
    onChange(entered ? next : value.slice(0, index));
    if (entered) {
      inputRefs.current[Math.min(entered.length > 1 ? next.length : index + 1, length - 1)]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      onChange(value.slice(0, index - 1));
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = index + (e.key === "ArrowLeft" ? -1 : 1);
      inputRefs.current[Math.max(0, Math.min(next, value.length, length - 1))]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
    }
  }

  return (
    <div role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : "PIN"} className="flex gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={digit}
          disabled={disabled}
          onFocus={(e) => {
            if (i > value.length) inputRefs.current[value.length]?.focus();
            else e.target.select();
          }}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
          className={`h-14 w-12 rounded-xl border text-center text-2xl font-semibold text-foreground shadow-card transition focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 disabled:opacity-60 ${
            digit ? "border-accent/50 bg-accent/5" : "border-border bg-surface"
          }`}
        />
      ))}
    </div>
  );
}
