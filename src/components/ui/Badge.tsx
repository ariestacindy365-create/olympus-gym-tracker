import { type HTMLAttributes } from "react";

type Tone = "default" | "success" | "accent" | "danger" | "muted";

const toneClasses: Record<Tone, string> = {
  default: "bg-surface-2 text-foreground border-border",
  success: "bg-success/10 text-success border-success/30",
  accent: "bg-accent/10 text-accent border-accent/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  muted: "bg-surface-2 text-muted border-border",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "default", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
