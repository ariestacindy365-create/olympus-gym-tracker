"use client";

import { type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return <Dialog title={title} onClose={onClose}>{children}</Dialog>;
}
