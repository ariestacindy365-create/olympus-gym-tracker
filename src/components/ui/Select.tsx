import { type SelectHTMLAttributes, forwardRef } from "react";

// Native <select> keeps the OS picker on mobile; .select-chevron (globals.css)
// only swaps the default arrow for a consistent one.
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface py-2.5 pl-3 pr-9 text-sm text-foreground shadow-card transition hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70 select-chevron ${className}`}
        {...props}
      />
    );
  }
);
Select.displayName = "Select";
