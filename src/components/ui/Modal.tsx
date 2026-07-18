"use client";

import { type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
