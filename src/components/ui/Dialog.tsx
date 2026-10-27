"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

let openDialogs = 0;
let originalBodyOverflow = "";

/** Native modal behavior keeps focus inside and restores it to the trigger. */
export function Dialog({
  title,
  description,
  onClose,
  children,
  role = "dialog",
  className = "max-w-md",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  role?: "dialog" | "alertdialog";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-dialog-autofocus]")?.focus();
    if (openDialogs === 0) originalBodyOverflow = document.body.style.overflow;
    openDialogs += 1;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      openDialogs -= 1;
      if (openDialogs === 0) document.body.style.overflow = originalBodyOverflow;
      // Passive cleanup can run after the dialog has left the DOM. Restore
      // explicitly, after any nested dialog has also finished closing.
      queueMicrotask(() => {
        if (previousFocus?.isConnected && !previousFocus.closest("dialog:not([open])")) previousFocus.focus({ preventScroll: true });
      });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-5 text-foreground shadow-overlay backdrop:bg-black/60 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="break-words font-display text-lg font-semibold">{title}</h2>
          {description && <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Tutup dialog" className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground">
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      {children}
    </dialog>
  );
}
