import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-background hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100",
  secondary:
    "bg-surface-2 text-foreground border border-border hover:border-accent disabled:opacity-50",
  ghost: "bg-transparent text-muted hover:text-foreground disabled:opacity-50",
  danger: "bg-danger text-white hover:brightness-110 disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
