// Human date for page headers, e.g. "Sabtu, 26 September 2026". Uses the
// server's local clock, same convention as todayDateKey().
export function todayLabel(): string {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
