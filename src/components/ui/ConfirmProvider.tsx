"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Button } from "@/components/ui/Button";

export interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  // Defaults to true. Turn off where a barcode scanner may still be firing —
  // its trailing Enter would otherwise press the focused confirm button.
  autoFocusConfirm?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Drop-in replacement for the browser's confirm(), styled like the rest of
// the app instead of popping a native dialog. Same call shape as confirm()
// when passed a plain string: `if (!(await confirmDialog("Hapus ini?"))) return;`
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

interface PendingConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  autoFocusConfirm: boolean;
  resolve: (result: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirmDialog = useCallback<ConfirmFn>((options) => {
    const o = typeof options === "string" ? { description: options } : options;
    return new Promise<boolean>((resolve) => {
      setPending({
        title: o.title ?? "Konfirmasi",
        description: o.description,
        confirmLabel: o.confirmLabel ?? "Ya, lanjutkan",
        cancelLabel: o.cancelLabel ?? "Batal",
        danger: o.danger ?? false,
        autoFocusConfirm: o.autoFocusConfirm ?? true,
        resolve,
      });
    });
  }, []);

  function settle(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => settle(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-overlay animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="font-display text-lg font-bold">
              {pending.title}
            </h2>
            <p className="mt-2 text-sm text-muted">{pending.description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => settle(false)}>
                {pending.cancelLabel}
              </Button>
              <Button
                variant={pending.danger ? "danger" : "primary"}
                className="px-4 py-2 text-sm"
                onClick={() => settle(true)}
                autoFocus={pending.autoFocusConfirm}
              >
                {pending.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
