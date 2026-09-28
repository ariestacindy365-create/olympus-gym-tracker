// Small stroke icons, sized by the surrounding font via 1em and colored via
// currentColor so they follow the button's hover/disabled styles.
interface IconProps {
  className?: string;
}

export function EditIcon({ className = "" }: IconProps) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon({ className = "" }: IconProps) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10M9 9v4M11 9v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InboxIcon({ className = "" }: IconProps) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <path d="M3 11l2.5-6h9L17 11M3 11v5a1 1 0 001 1h12a1 1 0 001-1v-5M3 11h4.2a.5.5 0 01.47.33L8.3 13a.5.5 0 00.47.33h2.46a.5.5 0 00.47-.33l.63-1.67a.5.5 0 01.47-.33H17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "" }: IconProps) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <circle cx="10" cy="10" r="7.25" />
      <path d="M7 10.2l2 2 4-4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertCircleIcon({ className = "" }: IconProps) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 6.5v4" strokeLinecap="round" />
      <circle cx="10" cy="13.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
