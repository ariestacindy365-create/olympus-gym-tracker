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

interface LiveBoardRowProps {
  memberId: string;
  memberName: string;
  online: boolean;
  row: LiveRow | null;
}

export function LiveBoardRow({ memberId, memberName, online, row }: LiveBoardRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/coach/members/${memberId}`} className="font-medium hover:text-accent">
            {memberName}
          </Link>
          {row?.isPR && <Badge tone="accent">PR</Badge>}
          {row?.isDebut ? (
            <Badge tone="accent">DEBUT</Badge>
          ) : (
            row?.estimated1RMDelta != null && (
              <Badge tone="success">+{row.estimated1RMDelta.toFixed(1)} est</Badge>
            )
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <MemberStatusBadge online={online} loggedToday={row !== null} />
        </div>
        {row?.note && <p className="mt-1 text-xs text-muted">&ldquo;{row.note}&rdquo;</p>}
      </div>

      <div className="shrink-0 sm:text-right">
        {row ? (
          <p className="font-display text-2xl font-bold">
            {row.weight}
            <span className="text-sm font-semibold text-muted">kg</span>{" "}
            <span className="text-sm font-normal text-muted">&times; {row.reps}</span>
          </p>
        ) : (
          <p className="text-sm text-muted">belum ada data</p>
        )}
      </div>
    </div>
  );
}
