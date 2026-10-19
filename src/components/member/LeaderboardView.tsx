"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatKg } from "@/lib/volumeStory";
import type { LeaderboardCategory, LeaderboardRow } from "@/lib/leaderboard";

const TABS: { id: LeaderboardCategory; label: string; unit: (v: number) => string }[] = [
  { id: "volume", label: "Volume", unit: (v) => `${formatKg(v)} kg` },
  { id: "days", label: "Hari Latihan", unit: (v) => `${v} hari` },
  { id: "prs", label: "PR", unit: (v) => `${v} PR` },
];

const TOP_N = 10;
const MEDALS = ["🥇", "🥈", "🥉"];

interface LeaderboardViewProps {
  boards: Record<LeaderboardCategory, LeaderboardRow[]>;
  currentMemberId: string;
}

export function LeaderboardView({ boards, currentMemberId }: LeaderboardViewProps) {
  const [tab, setTab] = useState<LeaderboardCategory>("volume");
  const def = TABS.find((t) => t.id === tab)!;
  const rows = boards[tab];
  const myIndex = rows.findIndex((r) => r.memberId === currentMemberId);
  const top = rows.slice(0, TOP_N);

  const row = (r: LeaderboardRow, rank: number) => {
    const me = r.memberId === currentMemberId;
    return (
      <li
        key={r.memberId}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
          me ? "bg-accent/10 ring-1 ring-accent/40" : rank <= 3 ? "bg-surface-2" : ""
        }`}
      >
        <span className="tabular w-8 shrink-0 text-center font-display text-lg font-bold">
          {MEDALS[rank - 1] ?? rank}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {r.name}
          {me && <span className="ml-1.5 text-xs font-semibold text-accent">(kamu)</span>}
        </span>
        <span className="tabular shrink-0 font-semibold">{def.unit(r.value)}</span>
      </li>
    );
  };

  return (
    <Card className="flex flex-col gap-4">
      <div role="tablist" aria-label="Kategori peringkat" className="grid grid-cols-3 rounded-lg bg-surface-2 p-1 text-sm font-semibold">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2 py-2 transition ${
              tab === t.id ? "bg-surface text-foreground shadow-card" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Belum ada data" description="Belum ada member yang tercatat di kategori ini bulan ini." />
      ) : (
        <ol className="flex flex-col gap-1">
          {top.map((r, i) => row(r, i + 1))}
          {myIndex >= TOP_N && (
            <>
              <li aria-hidden className="py-1 text-center text-muted">⋯</li>
              {row(rows[myIndex], myIndex + 1)}
            </>
          )}
        </ol>
      )}
      {myIndex < 0 && rows.length > 0 && (
        <p className="text-center text-xs text-muted">Catat latihanmu bulan ini supaya masuk peringkat.</p>
      )}
    </Card>
  );
}
