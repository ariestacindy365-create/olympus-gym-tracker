import { Card } from "@/components/ui/Card";

export interface TimelineEvent {
  date: string;
  label: string;
  detail?: string;
}

export function LeadTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-3 font-display text-lg font-semibold">Riwayat Perjalanan</h2>
      <ul className="flex flex-col gap-3">
        {events.map((event, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center pt-1">
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
              {i < events.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium">{event.label}</p>
              <p className="text-xs text-muted">
                {new Date(event.date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                {event.detail && ` · ${event.detail}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
