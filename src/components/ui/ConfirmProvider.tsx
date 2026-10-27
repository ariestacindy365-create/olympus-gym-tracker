"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
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
        <Dialog
          role="alertdialog"
          title={pending.title}
          description={pending.description}
          onClose={() => settle(false)}
          className="max-w-sm"
        >
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => settle(false)} autoFocus={!pending.autoFocusConfirm} data-dialog-autofocus={!pending.autoFocusConfirm ? "" : undefined}>
              {pending.cancelLabel}
            </Button>
            <Button
              variant={pending.danger ? "danger" : "primary"}
              className="px-4 py-2 text-sm"
              onClick={() => settle(true)}
              autoFocus={pending.autoFocusConfirm}
              data-dialog-autofocus={pending.autoFocusConfirm ? "" : undefined}
            >
              {pending.confirmLabel}
            </Button>
          </div>
        </Dialog>
      )}
    </ConfirmContext.Provider>
  );
}
