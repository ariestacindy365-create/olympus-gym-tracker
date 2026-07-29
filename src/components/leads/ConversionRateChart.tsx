"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  subWeeks,
  subMonths,
  format,
} from "date-fns";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Granularity = "day" | "week" | "month";

export interface ConversionEvent {
  trialMarkedAt: string | null;
  convertedAt: string | null;
}

function monthInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ConversionRateChart({ events }: { events: ConversionEvent[] }) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [month, setMonth] = useState(monthInputValue(new Date()));

  const parsed = useMemo(
    () => events.map((e) => ({
      trialMarkedAt: e.trialMarkedAt ? new Date(e.trialMarkedAt) : null,
      convertedAt: e.convertedAt ? new Date(e.convertedAt) : null,
    })),
    [events]
  );

  const chartData = useMemo(() => {
    const [year, monthNum] = month.split("-").map(Number);
    const anchor = new Date(year, monthNum - 1, 1);

    let buckets: { start: Date; end: Date; label: string }[];
    if (granularity === "day") {
      const start = startOfMonth(anchor);
      const end = endOfMonth(anchor);
      buckets = eachDayOfInterval({ start, end }).map((d) => ({
        start: startOfDay(d),
        end: endOfDay(d),
        label: format(d, "d/M"),
      }));
    } else if (granularity === "week") {
      const end = endOfMonth(anchor);
      const start = subWeeks(end, 11);
      buckets = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map((weekStart) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return { start: weekStart, end: endOfDay(weekEnd), label: format(weekStart, "d/M") };
      });
    } else {
      const end = endOfMonth(anchor);
      const start = startOfMonth(subMonths(end, 11));
      buckets = eachMonthOfInterval({ start, end }).map((m) => ({
        start: startOfMonth(m),
        end: endOfMonth(m),
        label: format(m, "MMM yy"),
      }));
    }

    return buckets.map(({ start, end, label }) => {
      const trialCount = parsed.filter((e) => e.trialMarkedAt && e.trialMarkedAt >= start && e.trialMarkedAt <= end).length;
      const conversionCount = parsed.filter((e) => e.convertedAt && e.convertedAt >= start && e.convertedAt <= end).length;
      const rate = trialCount > 0 ? Math.round((conversionCount / trialCount) * 100) : 0;
      return { label, trialCount, conversionCount, rate };
    });
  }, [parsed, granularity, month]);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Conversion Rate</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 text-xs">
            {(["day", "week", "month"] as Granularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`rounded-md px-3 py-1.5 font-medium ${
                  granularity === g ? "bg-accent text-background" : "bg-surface-2 text-muted"
                }`}
              >
                {g === "day" ? "Harian" : g === "week" ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-auto text-xs"
          />
        </div>
      </div>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} unit="%" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value, name, props) => {
                if (name === "rate") {
                  const { trialCount, conversionCount } = props.payload as { trialCount: number; conversionCount: number };
                  return [`${value}% (${conversionCount}/${trialCount})`, "Conversion Rate"];
                }
                return [value, name];
              }}
            />
            <Line type="monotone" dataKey="rate" name="rate" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
