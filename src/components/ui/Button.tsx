import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-sm shadow-accent/25 hover:bg-accent-2 disabled:opacity-50 disabled:shadow-none disabled:hover:bg-accent",
  secondary:
    "bg-surface text-foreground border border-border shadow-card hover:border-border-strong hover:bg-surface-2 disabled:opacity-50 disabled:hover:bg-surface",
  ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50",
  danger: "bg-danger text-white shadow-sm shadow-danger/25 hover:brightness-110 disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-150 cursor-pointer select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
