import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { MemberStatusBadge } from "@/components/coach/MemberStatusBadge";

export interface LiveRow {
  id: string;
  memberId: string;
  memberName: string;
  online: boolean;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  note: string | null;
  isPR: boolean;
  isDebut: boolean;
  estimated1RMDelta: number | null;
  updatedAt: string;
}

const MEDAL_COLORS: Record<number, string> = {
  1: "#d4af37",
  2: "#a8a9ad",
  3: "#cd7f32",
};

interface LiveBoardRowProps {
  rank: number | null;
  memberId: string;
  memberName: string;
  online: boolean;
  row: LiveRow | null;
}

export function LiveBoardRow({ rank, memberId, memberName, online, row }: LiveBoardRowProps) {
  const medalColor = rank ? MEDAL_COLORS[rank] : undefined;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-background"
          style={{ backgroundColor: medalColor ?? "var(--surface)", color: medalColor ? "#1a1a1a" : "var(--muted)" }}
        >
          {rank ?? "-"}
        </span>
        <div>
          <Link href={`/coach/members/${memberId}`} className="font-medium hover:text-accent">
            {memberName}
          </Link>
          {row && <p className="text-xs text-muted">{row.exerciseName}</p>}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-between gap-4 sm:justify-end">
        {row ? (
          <div className="text-sm">
            <p className="flex items-center gap-2">
              {row.reps} x {row.weight}kg
              {row.isPR && <Badge tone="accent">PR</Badge>}
              {row.isDebut ? (
                <Badge tone="accent">DEBUT</Badge>
              ) : (
                row.estimated1RMDelta != null && (
                  <Badge tone="success">+{row.estimated1RMDelta.toFixed(1)} est</Badge>
                )
              )}
            </p>
            {row.note && <p className="text-xs text-muted">&ldquo;{row.note}&rdquo;</p>}
          </div>
        ) : (
          <p className="text-sm text-muted">belum ada data</p>
        )}

        <MemberStatusBadge online={online} loggedToday={row !== null} />
      </div>
    </div>
  );
}
