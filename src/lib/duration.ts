// Client-safe: "1j 05m" / "45m".
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}j ${String(m).padStart(2, "0")}m` : `${m}m`;
}
