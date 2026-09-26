import { type HTMLAttributes } from "react";

type Tone = "default" | "success" | "accent" | "danger" | "muted";

const toneClasses: Record<Tone, string> = {
  default: "bg-surface-2 text-foreground border-border",
  success: "bg-success/10 text-success border-success/25",
  accent: "bg-accent/10 text-accent border-accent/25",
  danger: "bg-danger/10 text-danger border-danger/25",
  muted: "bg-surface-2 text-muted border-border",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "default", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
