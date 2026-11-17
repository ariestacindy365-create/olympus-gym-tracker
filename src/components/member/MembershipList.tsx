import Link from "next/link";
import { KIND_LABEL, creditsLeft, type MembershipKind } from "@/lib/fitquarter";

export interface MembershipView {
  id: string;
  packageName: string;
  kind: MembershipKind;
  canBook: boolean;
  credits: number | null;
  creditsUsed: number;
  startsAt: string;
  expiresAt: string;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "Sisa 5x" / "Unlimited" / "Kuota habis". */
export function creditsText(m: { credits: number | null; creditsUsed: number }) {
  const left = creditsLeft(m);
  return left == null ? "Unlimited" : left === 0 ? "Kuota habis" : `Sisa ${left}x`;
}

/** Akun: every membership that hasn't ended, with what's left and until when. */
export function MembershipList({ items, today }: { items: MembershipView[]; today: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Belum ada membership aktif. Hubungi admin Olympus kalau kamu sudah membayar.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((m) => {
        const left = creditsLeft(m);
        const upcoming = m.startsAt.slice(0, 10) > today;
        return (
          <li key={m.id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-semibold">{m.packageName.replace(/^[^:]+:\s*/, "")}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${left === 0 ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"}`}>{creditsText(m)}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {KIND_LABEL[m.kind]} · {upcoming ? `mulai ${fmt(m.startsAt)} · ` : ""}berlaku s/d {fmt(m.expiresAt)}
            </p>
            <p className="mt-1 text-xs font-semibold">{m.canBook ? "✓ Bisa booking kelas bootcamp" : m.kind === "PT" ? "Sesi PT dijadwalkan coach" : "Tidak termasuk kelas bootcamp"}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** Dashboard: one line with the membership that books classes. */
export function MembershipChip({ item }: { item: MembershipView | null }) {
  return (
    <Link href="/member/account#membership" className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-card">
      <span className="min-w-0 truncate">
        🎫 {item ? item.packageName.replace(/^[^:]+:\s*/, "") : "Belum ada membership aktif"}
      </span>
      {item && <span className="shrink-0 font-semibold text-accent">{creditsText(item)}</span>}
    </Link>
  );
}
