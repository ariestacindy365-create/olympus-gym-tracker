import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { creditsLeft, formatMembershipDate, type MembershipSummary } from "@/lib/membership";

/** Dashboard: is my membership active, until when, sessions left. */
export function MembershipCard({ summary, pending }: { summary: MembershipSummary; pending: boolean }) {
  const { current } = summary;
  const left = current ? creditsLeft(current) : null;
  const ending = summary.endingSoon;
  return (
    <Link href="/member/membership" className="block">
      <Card className="flex items-center justify-between gap-3 transition hover:border-border-strong">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Member</p>
          {current ? (
            <>
              <p className="truncate text-sm font-semibold">{current.packageName}</p>
              <p className="text-sm text-muted">
                s/d {formatMembershipDate(current.expiresAt)}
                {left != null && ` · sisa ${left} sesi`}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold">{pending ? "⏳ Menunggu konfirmasi admin" : "Belum ada member aktif"}</p>
          )}
          {ending && <p className="text-xs font-semibold text-accent">Segera habis, perpanjang yuk</p>}
        </div>
        <span className="shrink-0 text-sm font-semibold text-accent">{current && !ending ? "Lihat ›" : "Beli ›"}</span>
      </Card>
    </Link>
  );
}
