"use client";

import { createContext, useCallback, useContext, useState } from "react";
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

const AUTO_DISMISS_MS = 3500;
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

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const push = useCallback(
    (type: ToastItem["type"], message: string) => {
      const id = nextToastId++;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, type, message, leaving: false }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const api: ToastApi = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            role="status"
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-lg border bg-surface px-4 py-3 text-left text-sm font-medium shadow-raised transition-all duration-200 ${
              t.leaving ? "translate-y-1 scale-95 opacity-0" : "animate-pop-in translate-y-0 scale-100 opacity-100"
            } ${t.type === "success" ? "border-success/25" : "border-danger/25"}`}
          >
            <span className={`shrink-0 text-lg ${t.type === "success" ? "text-success" : "text-danger"}`}>
              {t.type === "success" ? <CheckCircleIcon /> : <AlertCircleIcon />}
            </span>
            <span className="text-foreground">{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
