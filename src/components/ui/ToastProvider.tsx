"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircleIcon, AlertCircleIcon } from "@/components/ui/Icons";

interface ToastItem {
  id: number;
  type: "success" | "error";
  message: string;
  leaving: boolean;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const AUTO_DISMISS_MS = 6000;
// Matches the transition duration on the toast element below — the "leaving"
// class has to stay mounted for this long so the fade/slide actually plays
// before the toast is removed from the array.
const EXIT_MS = 200;
// A rapid run of actions (e.g. deleting several rows in a row) could queue
// more toasts than the stack can show cleanly — drop the oldest instead of
// growing forever.
const MAX_VISIBLE = 4;
let nextToastId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, []);

  const pause = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const dismiss = useCallback((id: number) => {
    pause(id);
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    timers.current.set(id, setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, EXIT_MS));
  }, [pause]);

  const resume = useCallback((id: number) => {
    pause(id);
    timers.current.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS));
  }, [dismiss, pause]);

  const push = useCallback(
    (type: ToastItem["type"], message: string) => {
      const id = nextToastId++;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, type, message, leaving: false }]);
      if (type === "success") resume(id);
    },
    [resume]
  );

  const api: ToastApi = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={`${t.message}. Tutup notifikasi`}
            onMouseEnter={() => { if (!t.leaving) pause(t.id); }}
            onMouseLeave={() => { if (!t.leaving && t.type === "success") resume(t.id); }}
            onFocus={() => { if (!t.leaving) pause(t.id); }}
            onBlur={() => { if (!t.leaving && t.type === "success") resume(t.id); }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-lg border bg-surface px-4 py-3 text-left text-sm font-medium shadow-raised transition-all duration-200 ${
              t.leaving ? "translate-y-1 scale-95 opacity-0" : "animate-pop-in translate-y-0 scale-100 opacity-100"
            } ${t.type === "success" ? "border-success/25" : "border-danger/25"}`}
          >
            <span className={`shrink-0 text-lg ${t.type === "success" ? "text-success" : "text-danger"}`}>
              {t.type === "success" ? <CheckCircleIcon /> : <AlertCircleIcon />}
            </span>
            <span className="min-w-0 flex-1 break-words text-foreground">{t.message}</span>
            <span aria-hidden="true" className="ml-2 shrink-0 text-muted">✕</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
